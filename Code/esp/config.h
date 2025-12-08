#ifndef CONFIG_H
#define CONFIG_H

// WiFi Configuration
#define WIFI_SSID "your_wifi_name"
#define WIFI_PASSWORD "your_wifi_password"

// MQTT Configuration
// Option 1: Mosquitto (Local)
#define MQTT_BROKER "192.168.1.100"  // Your local MQTT broker IP
#define MQTT_PORT 1883
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""

// Option 2: HiveMQ Cloud (Comment out Option 1 and uncomment this)
// #define MQTT_BROKER "your-cluster.hivemq.cloud"
// #define MQTT_PORT 8883
// #define MQTT_USERNAME "your_username"
// #define MQTT_PASSWORD "your_password"

// Cabinet Configuration
#define CABINET_ID "CAB001"

// Camera Pins (AI-Thinker ESP32-CAM)
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

#endif
