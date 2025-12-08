# Hướng dẫn Thêm và Quản lý Thiết bị ESP32

## Tổng quan
Hệ thống Smart Cabinet sử dụng ESP32-CAM làm thiết bị phần cứng chính. Tài liệu này hướng dẫn chi tiết cách thêm, cấu hình và quản lý thiết bị.

---

## 1. Thêm Thiết bị Mới (Add Device)

### Bước 1: Truy cập trang quản lý
1. Đăng nhập với tài khoản **Admin**
2. Vào menu **Admin** > **Quản lý Devices**
3. Click nút **"Add Device"**

### Bước 2: Điền thông tin thiết bị

**Form có 3 trường chính:**

#### Device ID (Bắt buộc) *
- **Mô tả**: Mã định danh duy nhất cho thiết bị
- **Format**: `ESP32-XXXXX` (X là số hoặc chữ)
- **Ví dụ**: 
  - `ESP32-11111`
  - `ESP32-CAB01`
  - `ESP32-A1B2C`
- **Lưu ý**: 
  - Không được trùng với device đã có
  - Nên đặt theo qui tắc riêng của tổ chức (vd: ESP32-<Tầng><Phòng>)

#### Display Name (Tùy chọn)
- **Mô tả**: Tên hiển thị thân thiện cho thiết bị
- **Ví dụ**: 
  - `Cabinet 1`
  - `Tủ văn phòng A101`
  - `Tủ lưu trữ tầng 2`
- **Lưu ý**: Nếu để trống, hệ thống tự sinh tên: `Cabinet <Device_ID>`

#### Location (Bắt buộc) *
- **Mô tả**: Vị trí vật lý của thiết bị
- **Ví dụ**: 
  - `Tầng 1 - 101`
  - `Building A - Floor 3 - Room 305`
  - `Phòng IT - Góc phải`
- **Lưu ý**: Thông tin này giúp xác định vị trí khi có cảnh báo

#### MQTT Topic (Tự động)
- Hệ thống tự động tạo topic: `cabinet/<device_id>`
- Ví dụ: Device ID `ESP32-11111` → Topic `cabinet/esp32-11111`

### Bước 3: Xác nhận tạo thiết bị
1. Click **"Create Device"**
2. Hệ thống kiểm tra:
   - Device ID chưa tồn tại
   - Location không trống
3. Nếu thành công: Toast hiện "Device created successfully"
4. Thiết bị xuất hiện trong bảng với status **Offline**

---

## 2. Kết nối ESP32 với Hệ thống

### Phương pháp 1: Cấu hình thủ công

#### Bước 1: Chuẩn bị ESP32
\`\`\`cpp
// File: esp32-firmware/config.h

// WiFi Configuration
#define WIFI_SSID "Your_WiFi_Name"
#define WIFI_PASSWORD "Your_WiFi_Password"

// MQTT Configuration
#define MQTT_BROKER "192.168.1.100"  // IP của máy chạy backend
#define MQTT_PORT 1883
#define MQTT_USERNAME "admin"         // Nếu MQTT có auth
#define MQTT_PASSWORD "password"

// Device Configuration
#define DEVICE_ID "ESP32-11111"       // PHẢI TRÙNG với Device ID đã tạo
#define MQTT_TOPIC "cabinet/esp32-11111"

// Backend API
#define API_URL "http://192.168.1.100:3001"
\`\`\`

#### Bước 2: Upload firmware lên ESP32
\`\`\`bash
# Sử dụng Arduino IDE hoặc PlatformIO
# Chọn board: ESP32 Dev Module
# Upload code lên ESP32
\`\`\`

#### Bước 3: Kiểm tra kết nối
1. Mở Serial Monitor (115200 baud)
2. ESP32 sẽ in ra:
   \`\`\`
   Connecting to WiFi...
   WiFi connected: 192.168.1.105
   Connecting to MQTT...
   MQTT connected
   Device ESP32-11111 is online
   \`\`\`
3. Trên web, thiết bị chuyển từ **Offline** → **Online**

### Phương pháp 2: Pairing Mode (Đang phát triển)

#### Bước 1: Kích hoạt Pairing Mode
1. Trên web, click **"Pair New Device"**
2. Hệ thống tạo pairing code 6 số (vd: `123456`)
3. Code có hiệu lực 10 phút

#### Bước 2: Ghép nối ESP32
1. Nhấn nút **Pairing** trên ESP32 (GPIO pin được config)
2. ESP32 tự động:
   - Quét WiFi
   - Kết nối tới AP tạm thời
   - Gửi MAC address + pairing code
3. Backend xác thực và cấu hình device

---

## 3. Quản lý Thiết bị

### Xem danh sách thiết bị
**Bảng hiển thị các cột:**

| Cột | Mô tả | Ví dụ |
|-----|-------|-------|
| ID | ID trong database | 1 |
| Device ID | Mã định danh | ESP32-11111 |
| Name | Tên hiển thị | Cabinet 1 |
| Location | Vị trí | Tầng 1 - 101 |
| Status | Trạng thái khóa | locked/unlocked |
| Online | Trạng thái kết nối | ✅ Online / ❌ Offline |
| Last Seen | Lần online cuối | 8/12/2025 10:30 |
| Actions | Thao tác | Edit / Delete |

### Sửa thông tin thiết bị
1. Click nút **Edit** (icon bút chì)
2. Có thể sửa:
   - **Name**: Đổi tên hiển thị
   - **Location**: Cập nhật vị trí
3. **KHÔNG** sửa được Device ID (unique constraint)

### Xóa thiết bị
1. Click nút **Delete** (icon thùng rác)
2. Confirm dialog: "Are you sure?"
3. Hệ thống xóa:
   - Device từ bảng `cabinets`
   - Tất cả access logs liên quan
4. ESP32 sẽ không kết nối được nữa

---

## 4. Giải quyết lỗi thường gặp

### Lỗi 500: Internal Server Error khi tạo device

**Nguyên nhân:**
- Thiếu trường `name` trong request
- Device ID đã tồn tại
- Database connection lỗi

**Cách sửa:**
\`\`\`javascript
// Frontend phải gửi đầy đủ:
{
  "cabinet_id": "ESP32-11111",
  "name": "Cabinet 1",        // BẮT BUỘC
  "location": "Tầng 1 - 101"
}
\`\`\`

**Kiểm tra backend logs:**
\`\`\`bash
cd be
npm run dev

# Xem console khi tạo device
# Nếu lỗi SQL: kiểm tra database schema
\`\`\`

### Device luôn hiển thị Offline

**Nguyên nhân:**
1. ESP32 không kết nối được WiFi
2. MQTT broker không chạy
3. Device ID trên ESP32 khác với database

**Cách sửa:**
\`\`\`cpp
// ESP32: Kiểm tra Serial Monitor
// Phải thấy:
MQTT connected
Device ESP32-11111 is online
\`\`\`

\`\`\`bash
# Backend: Kiểm tra MQTT service
cd be
cat .env | grep MQTT

# Nên thấy:
MQTT_BROKER=mqtt://localhost:1883
\`\`\`

### ESP32 kết nối rồi lại disconnect

**Nguyên nhân:**
- WiFi không ổn định
- MQTT keepalive timeout
- Power supply không đủ

**Cách sửa:**
\`\`\`cpp
// Tăng keepalive time trong ESP32 code
client.setKeepAlive(60); // 60 seconds

// Thêm reconnect logic
void reconnectMQTT() {
  while (!client.connected()) {
    if (client.connect(DEVICE_ID)) {
      client.publish(MQTT_TOPIC, "online");
    } else {
      delay(5000);
    }
  }
}
\`\`\`

---

## 5. Mở/Khóa tủ từ xa

### Từ trang Dashboard (User)
1. Vào **"Tủ của tôi"**
2. Tìm cabinet cần điều khiển
3. Click nút:
   - **🔓 Unlock**: Mở khóa từ xa
   - **🔒 Lock**: Khóa từ xa

### Từ trang Admin Devices
1. Vào **Admin** > **Quản lý Devices**
2. Chọn device
3. Có thể thực hiện tương tự

### Luồng hoạt động
\`\`\`
[Web] Click Unlock 
  ↓
[Backend] POST /api/cabinets/:id/unlock
  ↓
[MQTT Service] Publish → cabinet/esp32-11111/control
  ↓
[ESP32] Subscribe nhận lệnh "unlock"
  ↓
[ESP32] Kích hoạt relay → Mở khóa
  ↓
[ESP32] Publish → cabinet/esp32-11111/status → "unlocked"
  ↓
[Backend] Update database: lock_status = 'unlocked'
  ↓
[Web] Real-time update hiển thị trạng thái mới
\`\`\`

---

## 6. Monitoring và Alerts

### Xem lịch sử truy cập
1. Vào **"Lịch sử"**
2. Xem tất cả lần:
   - Mở khóa bằng face
   - Mở khóa từ xa
   - Các lần thất bại

### Nhận cảnh báo
1. Vào **"Cảnh báo"**
2. Hiển thị:
   - Truy cập trái phép (face không nhận diện được)
   - Tamper detection (tủ bị phá)
   - Device offline quá lâu

### Email/SMS alerts (Future)
- Cấu hình trong **Admin** > **Cài đặt**
- Chọn loại cảnh báo cần notify

---

## 7. Test trên LAN

### Backend config
\`\`\`bash
# be/.env
HOST=0.0.0.0          # Listen trên tất cả interfaces
PORT=3001
\`\`\`

### Frontend config
\`\`\`bash
# fe/.env.local
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
\`\`\`

### ESP32 config
\`\`\`cpp
#define API_URL "http://192.168.1.100:3001"
#define MQTT_BROKER "192.168.1.100"
\`\`\`

### Test từ máy khác trong LAN
\`\`\`bash
# Test backend API
curl http://192.168.1.100:3001/api/cabinets

# Test frontend
# Mở browser: http://192.168.1.100:3000
\`\`\`

---

## 8. Troubleshooting Checklist

### Khi thêm device mới:
- [ ] Device ID unique (chưa tồn tại)
- [ ] Location đã điền
- [ ] Backend API đang chạy (port 3001)
- [ ] Database connection OK
- [ ] Đăng nhập với role admin

### Khi kết nối ESP32:
- [ ] WiFi credentials đúng
- [ ] Device ID trùng với database
- [ ] MQTT broker đang chạy
- [ ] IP address đúng (nếu LAN)
- [ ] Firewall không block port 1883

### Khi mở khóa từ xa:
- [ ] Device online (hiển thị ✅)
- [ ] MQTT service hoạt động
- [ ] ESP32 subscribe đúng topic
- [ ] Relay circuit kết nối đúng
- [ ] User có quyền truy cập cabinet

---

## Tóm tắt các API liên quan

\`\`\`bash
# Tạo device mới
POST /api/cabinets
Body: { cabinet_id, name, location }

# Lấy danh sách devices
GET /api/cabinets

# Cập nhật device
PUT /api/cabinets/:id
Body: { name, location }

# Xóa device
DELETE /api/cabinets/:id

# Mở khóa từ xa
POST /api/cabinets/:cabinet_id/unlock

# Khóa từ xa
POST /api/cabinets/:cabinet_id/lock

# Lấy status
GET /api/cabinets/:cabinet_id/status

# Lấy logs
GET /api/cabinets/:cabinet_id/logs?limit=50
\`\`\`

---

**Lưu ý quan trọng:**
- Device ID phải unique và không thay đổi sau khi tạo
- Luôn test kết nối local trước khi deploy production
- Backup database thường xuyên để tránh mất dữ liệu
- Sử dụng HTTPS/TLS khi deploy công khai
