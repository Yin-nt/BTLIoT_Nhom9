# ESP32-CAM Face Verification với API

## Tổng quan
Code Arduino này cho phép ESP32-CAM:
- Kết nối WiFi
- Chụp ảnh từ camera
- Gửi ảnh tới API `/api/verify` (multipart/form-data)
- Parse JSON response
- Điều khiển relay/servo để mở khóa nếu xác thực thành công

## Hardware cần thiết

### 1. ESP32-CAM (AI-Thinker)
- Module camera ESP32 tích hợp WiFi
- Khuyến nghị: Dùng nguồn 5V/2A ổn định (không qua USB-to-Serial)

### 2. Relay Module hoặc Servo Motor
- **Relay**: Để điều khiển khóa điện từ (solenoid lock)
- **Servo**: Để quay chốt cơ học
- Kết nối GPIO: mặc định GPIO 12 (có thể thay đổi trong code)

### 3. Nút bấm (tùy chọn)
- Kết nối GPIO 13 với GND (pull-up internal)
- Dùng để trigger chụp ảnh thủ công

### 4. Nguồn điện
- ESP32-CAM: 5V/2A (qua chân 5V và GND)
- Relay: thường dùng chung nguồn 5V hoặc nguồn riêng nếu relay công suất lớn



## Cài đặt Arduino IDE

### 1. Thêm ESP32 Board
- Mở Arduino IDE
- File → Preferences → Additional Board Manager URLs:
  ```
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
  ```
- Tools → Board → Boards Manager → Tìm "ESP32" → Cài đặt "esp32 by Espressif Systems"

### 2. Chọn Board
- Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**
- Tools → Partition Scheme → **Huge APP (3MB No OTA)**
- Tools → Upload Speed → **115200**

### 3. Cài thư viện
- Tools → Manage Libraries
- Tìm và cài **ArduinoJson** (phiên bản 6.x)

## Cấu hình code

Mở file `ESP32_CAM_Face_Verify.ino` và chỉnh sửa:

```cpp
//lưu ý esp32cam và laptop kết nối phải chung 1 wifi
// WiFi
const char* ssid = "YOUR_WIFI_SSID";          // Tên WiFi của bạn
const char* password = "YOUR_WIFI_PASSWORD";  // Mật khẩu WiFi

// API Server (thay IP máy tính chạy FastAPI)
const char* serverUrl = "http://<IP_MayTinh>:8000/api/verify";

// GPIO (tùy chỉnh nếu cần)
#define RELAY_PIN 12        // Chân điều khiển relay
#define BUTTON_PIN 13       // Chân nút bấm
#define LED_FLASH 4         // Đèn flash (built-in)
```

### Lấy IP máy tính chạy API
- Trên Windows: mở cmd, gõ `ipconfig`, tìm IPv4 Address (ví dụ: 192.168.1.100)
- Thay vào `serverUrl`: `http://<IP_MayTinh>:8000/api/verify` 
- Ví dụ: "http://192.168.136.74:8000/api/verify"

## Thực hiện
### 1. Chạy server
####  Vào thư mục dự án
cd H:\DOCUMENT\IoT\Tu2

#### Tạo môi trường ảo
python -m venv venv
venv\Scripts\activate

####  Cài thư viện
pip install -r requirements.txt
#### Chạy server (trong thư mục dự án)
python -m uvicorn "api.main:app" --host 0.0.0.0 --port 8000 --reload
### 2. Kết nối esp32cam
#### Compile code và push lên esp32
#### Kiểm tra tình trạng monitor








#