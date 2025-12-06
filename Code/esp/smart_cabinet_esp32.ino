#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "config.h"

// WiFi and MQTT clients
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Pin definitions
#define RELAY_PIN 12
#define LED_PIN 33

// Cabinet info
const char* cabinetId = CABINET_ID;

// MQTT topics
String topicControl;
String topicStatus;
String topicVerify;
String topicVerifyResult;

void setup() {
  Serial.begin(115200);
  
  // Setup pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Locked by default
  digitalWrite(LED_PIN, LOW);
  
  // Connect WiFi
  connectWiFi();
  
  // Setup camera
  setupCamera();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(20000); // Increase buffer for images
  
  // Setup topics
  topicControl = String("cabinet/") + cabinetId + "/control";
  topicStatus = String("cabinet/") + cabinetId + "/status";
  topicVerify = String("cabinet/") + cabinetId + "/verify";
  topicVerifyResult = String("cabinet/") + cabinetId + "/verify/result";
  
  connectMQTT();
}

void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();
  
  // Send status every 30 seconds
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 30000) {
    sendStatus();
    lastStatus = millis();
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected");
  Serial.println("IP: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to MQTT...");
    
    String clientId = String("ESP32_") + cabinetId;
    
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println("connected");
      
      // Subscribe to control and verify result topics
      mqttClient.subscribe(topicControl.c_str());
      mqttClient.subscribe(topicVerifyResult.c_str());
      
      sendStatus();
    } else {
      Serial.print("failed, rc=");
      Serial.println(mqttClient.state());
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.println("]");
  
  // Parse JSON
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.println("JSON parsing failed");
    return;
  }
  
  String topicStr = String(topic);
  
  // Handle control commands
  if (topicStr == topicControl) {
    const char* action = doc["action"];
    
    if (strcmp(action, "unlock") == 0) {
      unlockCabinet();
    } else if (strcmp(action, "lock") == 0) {
      lockCabinet();
    } else if (strcmp(action, "capture") == 0) {
      captureAndVerify();
    }
  }
  // Handle verification results
  else if (topicStr == topicVerifyResult) {
    bool success = doc["success"];
    
    if (success) {
      const char* username = doc["username"];
      Serial.print("Access granted for: ");
      Serial.println(username);
      unlockCabinet();
      
      // Auto-lock after 5 seconds
      delay(5000);
      lockCabinet();
    } else {
      Serial.println("Access denied");
      blinkLED(3); // Blink LED 3 times to indicate denial
    }
  }
}

void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_CIF;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return;
  }
  
  Serial.println("Camera initialized");
}

void captureAndVerify() {
  Serial.println("Capturing image...");
  
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }
  
  // Convert to base64
  String base64Image = base64Encode(fb->buf, fb->len);
  
  // Send to backend for verification
  StaticJsonDocument<20000> doc;
  doc["image"] = base64Image;
  doc["cabinet_id"] = cabinetId;
  doc["timestamp"] = millis();
  
  char jsonBuffer[20000];
  serializeJson(doc, jsonBuffer);
  
  mqttClient.publish(topicVerify.c_str(), jsonBuffer);
  
  Serial.println("Image sent for verification");
  
  esp_camera_fb_return(fb);
}

String base64Encode(const uint8_t* data, size_t length) {
  const char* base64_chars = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  
  String encoded;
  int i = 0;
  int j = 0;
  uint8_t array3[3];
  uint8_t array4[4];
  
  while (length--) {
    array3[i++] = *(data++);
    if (i == 3) {
      array4[0] = (array3[0] & 0xfc) >> 2;
      array4[1] = ((array3[0] & 0x03) << 4) + ((array3[1] & 0xf0) >> 4);
      array4[2] = ((array3[1] & 0x0f) << 2) + ((array3[2] & 0xc0) >> 6);
      array4[3] = array3[2] & 0x3f;
      
      for (i = 0; i < 4; i++) {
        encoded += base64_chars[array4[i]];
      }
      i = 0;
    }
  }
  
  if (i) {
    for (j = i; j < 3; j++) {
      array3[j] = '\0';
    }
    
    array4[0] = (array3[0] & 0xfc) >> 2;
    array4[1] = ((array3[0] & 0x03) << 4) + ((array3[1] & 0xf0) >> 4);
    array4[2] = ((array3[1] & 0x0f) << 2) + ((array3[2] & 0xc0) >> 6);
    
    for (j = 0; j < i + 1; j++) {
      encoded += base64_chars[array4[j]];
    }
    
    while (i++ < 3) {
      encoded += '=';
    }
  }
  
  return encoded;
}

void lockCabinet() {
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("Cabinet LOCKED");
  sendStatus();
}

void unlockCabinet() {
  digitalWrite(RELAY_PIN, LOW);
  Serial.println("Cabinet UNLOCKED");
  digitalWrite(LED_PIN, HIGH);
  sendStatus();
}

void sendStatus() {
  StaticJsonDocument<256> doc;
  doc["cabinet_id"] = cabinetId;
  doc["status"] = "online";
  doc["lock_status"] = digitalRead(RELAY_PIN) == HIGH ? "locked" : "unlocked";
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["timestamp"] = millis();
  
  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  
  mqttClient.publish(topicStatus.c_str(), jsonBuffer);
}

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}
