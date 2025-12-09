/*
 * ESP32-CAM Face Recognition với API Verify
 * 
 * Chức năng:
 * - Kết nối WiFi
 * - Chụp ảnh từ ESP32-CAM
 * - Gửi ảnh tới API /api/verify (multipart/form-data)
 * - Parse JSON response
 * - Điều khiển relay/servo để mở khóa nếu verified
 * - Hiển thị kết quả qua Serial
 * 
 * Hardware:
 * - ESP32-CAM (AI-Thinker)
 * - Relay hoặc Servo motor (kết nối GPIO 12 hoặc 13)
 * - Nguồn 5V/2A
 * 
 * Cài đặt Arduino IDE:
 * 1. Thêm ESP32 board: File > Preferences > Additional Board URLs:
 *    https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 * 2. Tools > Board > ESP32 Arduino > AI Thinker ESP32-CAM
 * 3. Tools > Partition Scheme > Huge APP (3MB No OTA)
 * 4. Cài thư viện: ArduinoJson (v6.x)
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include "esp_camera.h"
#include "esp_http_client.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>  // Thư viện MQTT
#include <ESP32Servo.h>    // Thư viện Servo

// ============================================
// CẤU HÌNH WIFI & API
// ============================================
const char* ssid = "vu";          // Thay SSID WiFi của bạn
const char* password = "12345678";  // Thay mật khẩu WiFi
const char* serverUrl = "http://192.168.219.74:8000/api/verify";  // THAY XXX BẰNG IP MÁY TÍNH (xem ipconfig)

// ============================================
// CẤU HÌNH MQTT
// ============================================
const char* mqttBroker = "test.mosquitto.org";  // HiveMQ public broker
const int mqttPort = 1883;
const char* mqttClientId = "ESP32CAM_namvu";  // THAY ĐỔI để tránh trùng với ESP32 khác
const char* mqttTopic = "iot/door/verify/result";  // Topic nhận kết quả verify

// ============================================
// CẤU HÌNH GPIO (SERVO + PIR)
// ============================================
#define SERVO_PIN   14      // GPIO điều khiển servo (IO14)
#define BUTTON_PIN 13       // GPIO nút bấm để chụp ảnh (IO13)
#define LED_FLASH 4         // GPIO đèn flash (built-in)
#define PIR_PIN 15          // GPIO cảm biến PIR (IO15) - THAY ĐỔI TỪ GPIO 2

// Góc servo
#define SERVO_LOCK_ANGLE 0      // Góc khóa cửa (0°)
#define SERVO_UNLOCK_ANGLE 90   // Góc mở khóa (90°)

// ============================================
// CẤU HÌNH CAMERA (AI-Thinker ESP32-CAM)
// ============================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ============================================
// BIẾN TOÀN CỤC
// ============================================
bool wifiConnected = false;
unsigned long lastCaptureTime = 0;
const unsigned long captureInterval = 5000;

// MQTT client
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Servo motor
Servo doorServo;

// PIR sensor
bool motionDetected = false;
unsigned long lastMotionTime = 0;
const unsigned long motionCooldown = 2000;  // Cooldown 2 giây sau khi phát hiện chuyển động 

// ============================================
// KHỞI TẠO CAMERA
// ============================================
bool initCamera() {
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
  config.xclk_freq_hz = 10000000;  // 10MHz (giảm từ 20MHz để tiết kiệm dòng)
  config.pixel_format = PIXFORMAT_JPEG;

  // Chất lượng ảnh - Nếu nguồn 5V/2A đủ mạnh, dùng VGA để nhận diện tốt hơn
  if(psramFound()){
    config.frame_size = FRAMESIZE_QVGA;  // QVGA: 320x240 (thay vì VGA)
    config.jpeg_quality = 15;            // 0-63, càng thấp càng rõ
    config.fb_count = 1;                 // Giảm buffer từ 2 xuống 1
  } 
  else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
  }

  // Khởi tạo camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init FAILED: 0x%x\n", err);
    return false;
  }

  // Cài đặt sensor (tùy chỉnh độ sáng, contrast, saturation)
  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 2);     // -2 to 2 → TĂNG LÊN 2 (sáng nhất)
  s->set_contrast(s, 1);       // -2 to 2 → TĂNG contrast lên 1
  s->set_saturation(s, 0);     // -2 to 2
  s->set_whitebal(s, 1);       // 0 = disable , 1 = enable
  s->set_awb_gain(s, 1);       // 0 = disable , 1 = enable (auto white balance gain)
  s->set_wb_mode(s, 0);        // 0 to 4 - if awb_gain enabled
  s->set_exposure_ctrl(s, 1);  // 0 = disable , 1 = enable (auto exposure)
  s->set_aec2(s, 0);           // 0 = disable , 1 = enable
  s->set_ae_level(s, 2);       // -2 to 2 → TĂNG LÊN 2 (exposure cao nhất)
  s->set_gain_ctrl(s, 1);      // 0 = disable , 1 = enable (auto gain)
  s->set_agc_gain(s, 10);      // 0 to 30 → TĂNG LÊN 10 (gain cao hơn)
  s->set_gainceiling(s, (gainceiling_t)6);  // 0 to 6 → TĂNG LÊN 6 (gain ceiling cao nhất)
  s->set_hmirror(s, 0);        // 0 = disable , 1 = enable (mirror horizontal)
  s->set_vflip(s, 0);          // 0 = disable , 1 = enable (flip vertical)

  Serial.println("Camera init OK");
  return true;
}

// ============================================
// CALLBACK MQTT - XỬ LÝ MESSAGE NHẬN ĐƯỢC
// ============================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 MQTT Message received on topic: ");
  Serial.println(topic);
  
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("📄 Payload: ");
  Serial.println(message);
  
  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("❌ JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  const char* status = doc["status"];
  
  if (strcmp(status, "success") == 0) {
    // XÁC THỰC THÀNH CÔNG - MỞ KHÓA
    const char* name = doc["name"];
    const char* acc = doc["acc"];
    float score = doc["score"];
    
    Serial.println("\n✅ VERIFIED VIA MQTT!");
    Serial.printf("👤 Name: %s\n", name);
    Serial.printf("🆔 Account: %s\n", acc);
    Serial.printf("📊 Score: %.3f\n", score);
    
    // MỞ KHÓA - QUAY SERVO
    doorServo.write(SERVO_UNLOCK_ANGLE);
    Serial.printf("🔓 DOOR UNLOCKED (Servo: %d°)\n", SERVO_UNLOCK_ANGLE);
    delay(3000);  // Giữ mở 3 giây
    
    // KHÓA LẠI
    doorServo.write(SERVO_LOCK_ANGLE);
    Serial.printf("🔒 DOOR LOCKED (Servo: %d°)\n\n", SERVO_LOCK_ANGLE);
    
  } else {
    // XÁC THỰC THẤT BẠI
    const char* message = doc["message"];
    Serial.println("\n❌ VERIFICATION FAILED (MQTT)");
    Serial.printf("Reason: %s\n\n", message ? message : "Unknown");
  }
}

// ============================================
// KẾT NỐI MQTT
// ============================================
void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("🔌 Connecting to MQTT broker: ");
    Serial.println(mqttBroker);
    
    if (mqttClient.connect(mqttClientId)) {
      Serial.println("✅ MQTT Connected!");
      
      // Subscribe topic
      mqttClient.subscribe(mqttTopic);
      Serial.print("📡 Subscribed to topic: ");
      Serial.println(mqttTopic);
      
    } else {
      Serial.print("❌ MQTT connection failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ============================================
// KẾT NỐI WIFI
// ============================================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);  // Tắt chế độ tiết kiệm pin để kết nối ổn định
  WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Giảm công suất WiFi để tiết kiệm dòng
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection FAILED!");
    wifiConnected = false;
  }
}

// ============================================
// GỬI ẢNH TỚI API VERIFY
// ============================================
String sendImageToAPI(camera_fb_t * fb) {
  if (!fb) {
    Serial.println("Camera capture failed");
    return "{\"status\":\"failed\",\"message\":\"Camera error\"}";
  }

  Serial.printf("Image size: %d bytes\n", fb->len);

  // Tạo boundary ngẫu nhiên cho multipart/form-data
  String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
  
  // HTTP Client
  WiFiClient client;
  
  // Parse URL
  String url = String(serverUrl);
  int portStart = url.indexOf(":", 7);  // Bỏ qua "http://"
  int pathStart = url.indexOf("/", 7);
  
  String host = url.substring(7, portStart);
  int port = url.substring(portStart + 1, pathStart).toInt();
  String path = url.substring(pathStart);
  
  Serial.printf("Connecting to: %s:%d%s\n", host.c_str(), port, path.c_str());
  
  if (!client.connect(host.c_str(), port)) {
    Serial.println("Connection to server failed");
    Serial.printf("Check: 1) API running? 2) IP correct (%s)? 3) Firewall? 4) Same network?\n", host.c_str());
    return "{\"status\":\"failed\",\"message\":\"Connection error\"}";
  }
  
  Serial.println("Connected to server, sending data...");

  // Tạo body multipart/form-data
  String head = "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";
  
  String tail = "\r\n--" + boundary + "--\r\n";
  
  uint32_t totalLen = head.length() + fb->len + tail.length();
  
  // Gửi HTTP POST request
  client.println("POST " + path + " HTTP/1.1");
  client.println("Host: " + host);
  client.println("Content-Type: multipart/form-data; boundary=" + boundary);
  client.println("Content-Length: " + String(totalLen));
  client.println("Connection: close");
  client.println();
  
  // Gửi body
  client.print(head);
  
  // Gửi dữ liệu ảnh (chunk by chunk để tránh tràn bộ nhớ)
  uint8_t *fbBuf = fb->buf;
  size_t fbLen = fb->len;
  size_t chunkSize = 1024;
  for (size_t i = 0; i < fbLen; i += chunkSize) {
    size_t len = min(chunkSize, fbLen - i);
    client.write(fbBuf + i, len);
  }
  
  client.print(tail);
  
  // Đợi response
  unsigned long timeout = millis();
  while (client.connected() && !client.available()) {
    if (millis() - timeout > 10000) {
      Serial.println("API timeout");
      client.stop();
      return "{\"status\":\"failed\",\"message\":\"Timeout\"}";
    }
    delay(10);
  }
  
  // Đọc response
  String response = "";
  bool headerEnded = false;
  while (client.available()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") {
      headerEnded = true;
    } else if (headerEnded) {
      response += line;
    }
  }
  
  client.stop();
  
  Serial.println("API Response:");
  Serial.println(response);
  
  return response;
}

// ============================================
// XỬ LÝ KẾT QUẢ VERIFY
// ============================================
void processVerifyResult(String jsonResponse) {
  // Parse JSON
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, jsonResponse);
  
  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  const char* status = doc["status"];
  
  if (strcmp(status, "success") == 0) {
    // XÁC THỰC THÀNH CÔNG
    const char* name = doc["name"];
    const char* acc = doc["acc"];
    float score = doc["score"];
    
    Serial.println("✓ VERIFIED!");
    Serial.printf("Name: %s\n", name);
    Serial.printf("Account: %s\n", acc);
    Serial.printf("Score: %.3f\n", score);
    
    // MỞ KHÓA - QUAY SERVO
    doorServo.write(SERVO_UNLOCK_ANGLE);
    Serial.printf("🔓 DOOR UNLOCKED (Servo: %d°)\n", SERVO_UNLOCK_ANGLE);
    delay(3000);  // Giữ mở 3 giây
    
    // KHÓA LẠI
    doorServo.write(SERVO_LOCK_ANGLE);
    Serial.printf("🔒 DOOR LOCKED (Servo: %d°)\n", SERVO_LOCK_ANGLE);
    
  } else {
    // XÁC THỰC THẤT BẠI
    const char* message = doc["message"];
    Serial.println("✗ VERIFICATION FAILED");
    Serial.printf("Reason: %s\n", message ? message : "Unknown");
    
    // Có thể thêm buzzer cảnh báo
    // digitalWrite(BUZZER_PIN, HIGH);
    // delay(500);
    // digitalWrite(BUZZER_PIN, LOW);
  }
}

// ============================================
// CHỤP ẢNH VÀ XÁC THỰC
// ============================================
void captureAndVerify() {
  Serial.println("\n=== CAPTURING IMAGE ===");
  
  // Bật flash để tăng độ sáng (nếu điều kiện ánh sáng kém)
  digitalWrite(LED_FLASH, HIGH);
  delay(200);  // Đợi flash ổn định
  
  camera_fb_t * fb = esp_camera_fb_get();
  
  digitalWrite(LED_FLASH, LOW);  // Tắt flash ngay sau khi chụp
  
  if (!fb) {
    Serial.println("Camera capture failed!");
    return;
  }
  
  Serial.println("Image captured, sending to API...");
  
  String response = sendImageToAPI(fb);
  esp_camera_fb_return(fb);
  
  processVerifyResult(response);
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== ESP32-CAM Face Verify ===");
  
  // Cấu hình GPIO
  pinMode(LED_FLASH, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(PIR_PIN, INPUT_PULLDOWN);  // Cảm biến PIR với pull-down (tránh floating khi chưa kết nối)
  digitalWrite(LED_FLASH, LOW);      // Tắt flash
  
  Serial.println("🔍 PIR sensor initialized on GPIO 15 (IO15) with PULLDOWN");
  
  // Khởi tạo servo
  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_LOCK_ANGLE);  // Khóa mặc định
  Serial.printf("🔧 Servo initialized on GPIO %d (Lock angle: %d°)\n", SERVO_PIN, SERVO_LOCK_ANGLE);
  
  // Khởi tạo camera
  if (!initCamera()) {
    Serial.println("Camera init failed! Restarting...");
    delay(3000);
    ESP.restart();
  }
  
  // Đợi camera ổn định trước khi kết nối WiFi (giảm dòng spike)
  delay(1000);
  
  // Kết nối WiFi
  connectWiFi();
  
  if (!wifiConnected) {
    Serial.println("WiFi required! Restarting...");
    delay(3000);
    ESP.restart();
  }
  
  // Cấu hình MQTT
  mqttClient.setServer(mqttBroker, mqttPort);
  mqttClient.setCallback(mqttCallback);
  
  // Kết nối MQTT
  connectMQTT();
  
  Serial.println("\n=== READY ===");
  Serial.println("Press button or wait for auto-capture...");
}

// ============================================
// LOOP
// ============================================
void loop() {
  // Kiểm tra kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectWiFi();
    delay(5000);
    return;
  }
  
  // Kiểm tra và duy trì kết nối MQTT
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();  // Xử lý MQTT messages
  
  // Chế độ 1: Nút bấm (ưu tiên)
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50);  // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      captureAndVerify();
      while (digitalRead(BUTTON_PIN) == LOW) {
        delay(10);  // Đợi thả nút
      }
      delay(2000);  // Cooldown 2 giây
    }
  }
  
  // Chế độ 2: PIR Motion Detection (phát hiện chuyển động)
  int pirState = digitalRead(PIR_PIN);
  
  // Hiển thị trạng thái PIR liên tục (theo dõi mọi thay đổi)
  static int lastPirState = -1;  // -1 = chưa khởi tạo
  if (pirState != lastPirState) {
    Serial.printf("PIR Status Changed: %s (GPIO %d) at %lu ms\n", 
                  pirState == HIGH ? "HIGH - Motion detected" : "LOW - No motion", 
                  PIR_PIN,
                  millis());
    lastPirState = pirState;
  }
  
  if (pirState == HIGH && !motionDetected) {
    // Phát hiện chuyển động MỚI
    if (millis() - lastMotionTime > motionCooldown) {
      motionDetected = true;
      lastMotionTime = millis();
      
      Serial.println("\n🚶 MOTION DETECTED! Starting capture...");
      captureAndVerify();
      
      delay(1000);  // Đợi 1 giây trước khi cho phép phát hiện tiếp
    }
  } else if (pirState == LOW) {
    motionDetected = false;  // Reset trạng thái khi không có chuyển động
  }
  
  delay(100);
}