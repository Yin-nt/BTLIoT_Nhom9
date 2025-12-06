# Hướng Dẫn Test Hệ Thống Smart Cabinet

## 1. Kiểm Tra Database

### Sau khi chạy backend, kiểm tra tables đã được tạo:

\`\`\`sql
mysql -u root -p
USE smart_cabinet;
SHOW TABLES;
\`\`\`

**Kết quả mong đợi (7 tables):**
- users
- user_face_images
- face_embeddings
- cabinets
- access_logs
- device_pairings
- system_settings (optional)

### Kiểm tra cấu trúc bảng users:

\`\`\`sql
DESCRIBE users;
\`\`\`

**Columns mong đợi:**
- user_id (INT, PK, AUTO_INCREMENT)
- username (VARCHAR, UNIQUE)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- full_name (VARCHAR)
- role (ENUM: 'admin', 'user')
- image_url (TEXT)
- created_at (TIMESTAMP)

## 2. Test Backend API

### 2.1. Health Check

\`\`\`bash
curl http://localhost:3001/health
\`\`\`

**Kết quả:** `{"status":"ok","message":"Backend service is running"}`

### 2.2. Test Register (Postman hoặc cURL)

\`\`\`bash
# Tạo file test với ảnh
curl -X POST http://localhost:3001/api/users/register \
  -F "username=testuser" \
  -F "email=test@ptit.edu.vn" \
  -F "password=123456" \
  -F "fullName=Nguyen Van Test" \
  -F "images=@face1.jpg" \
  -F "images=@face2.jpg" \
  -F "images=@face3.jpg" \
  -F "images=@face4.jpg" \
  -F "images=@face5.jpg"
\`\`\`

**Kết quả mong đợi:**
\`\`\`json
{
  "message": "Registration successful. Waiting for admin approval.",
  "userId": 1
}
\`\`\`

### 2.3. Kiểm tra user đã được tạo:

\`\`\`sql
SELECT * FROM users;
SELECT * FROM user_face_images;
\`\`\`

### 2.4. Phê duyệt user (update status):

\`\`\`sql
UPDATE users SET status = 'active' WHERE id = 1;
\`\`\`

### 2.5. Test Login

\`\`\`bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
\`\`\`

**Kết quả mong đợi:**
\`\`\`json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "testuser",
    "role": "user"
  }
}
\`\`\`

## 3. Test Frontend

### 3.1. Mở trình duyệt

\`\`\`
http://localhost:3000
\`\`\`

### 3.2. Test Register Flow:

1. Click "Đăng ký ngay"
2. Điền form thông tin
3. Click "Bật Camera"
4. Chụp 5-20 ảnh khuôn mặt
5. Click "Đăng Ký"
6. Kiểm tra console backend xem có log không
7. Kiểm tra database: `SELECT * FROM users WHERE username='...';`

### 3.3. Test Login Flow:

1. Truy cập `/login`
2. Nhập username/password
3. Click "Đăng nhập"
4. Nếu status='pending', sẽ báo lỗi
5. Nếu status='active', redirect đến `/dashboard`

### 3.4. Kiểm tra Token:

Mở DevTools (F12) → Console:
\`\`\`javascript
localStorage.getItem('token')
localStorage.getItem('user')
\`\`\`

## 4. Test MQTT

### 4.1. Kiểm tra MQTT Connection (Backend logs):

\`\`\`
✅ Database initialized successfully
Backend server running on port 3001
MQTT Broker: mqtt://localhost:1883
AI Service: http://localhost:8000
Connected to MQTT broker
Subscribed to cabinet/+/status
\`\`\`

### 4.2. Test publish message (dùng MQTT client):

\`\`\`bash
# Install mosquitto-clients
sudo apt-get install mosquitto-clients

# Subscribe
mosquitto_sub -h localhost -t "cabinet/#" -v

# Publish test message
mosquitto_pub -h localhost -t "cabinet/CAB001/status" -m '{"locked":true}'
\`\`\`

## 5. Test AI Service (sau khi cài)

### 5.1. Health check:

\`\`\`bash
curl http://localhost:8000/health
\`\`\`

### 5.2. Test face detection:

\`\`\`bash
curl -X POST http://localhost:8000/api/detect \
  -F "image=@test_face.jpg"
\`\`\`

### 5.3. Test embedding extraction:

\`\`\`bash
curl -X POST http://localhost:8000/api/embedding \
  -F "image=@test_face.jpg"
\`\`\`

## 6. Test Full Registration Flow với AI

### 6.1. Register user qua frontend (5-20 ảnh)

### 6.2. Backend sẽ gọi AI service:

\`\`\`javascript
POST http://localhost:8000/api/register
{
  "user_id": 1,
  "images": [base64_image1, base64_image2, ...]
}
\`\`\`

### 6.3. AI service sẽ:
- Detect faces từ mỗi ảnh (YOLOFace)
- Extract embeddings (ArcFace)
- Lưu vào database table `face_embeddings`

### 6.4. Kiểm tra embeddings:

\`\`\`sql
SELECT user_id, COUNT(*) as embedding_count 
FROM face_embeddings 
GROUP BY user_id;
\`\`\`

## 7. Test Face Verification

### 7.1. Upload 1 ảnh để verify:

\`\`\`bash
curl -X POST http://localhost:3001/api/face/verify \
  -F "image=@test_verify.jpg"
\`\`\`

### 7.2. Backend flow:
1. Gọi AI service: `/api/embedding` (extract embedding từ ảnh)
2. So sánh với tất cả embeddings trong DB
3. Tìm user có cosine similarity > threshold (70%)
4. Trả về user_id và confidence score

**Kết quả mong đợi:**
\`\`\`json
{
  "success": true,
  "user_id": 1,
  "username": "testuser",
  "confidence": 85.5
}
\`\`\`

## 8. Troubleshooting

### Lỗi: Tables không được tạo

\`\`\`bash
# Kiểm tra logs backend
# Nếu thấy "Tables not found. Creating schema..."
# Nhưng không có "✅ Tables created successfully"
# → Kiểm tra file scripts/01-create-database.sql có tồn tại không

ls -la scripts/
\`\`\`

### Lỗi: Cannot connect to MySQL

\`\`\`bash
# Kiểm tra MySQL đang chạy
sudo systemctl status mysql

# Kiểm tra .env
cat be/.env

# Test connection
mysql -h localhost -u root -p
\`\`\`

### Lỗi: MQTT connection failed

\`\`\`bash
# Kiểm tra Mosquitto đang chạy
sudo systemctl status mosquitto

# Test MQTT broker
mosquitto_pub -h localhost -t "test" -m "hello"
\`\`\`

### Lỗi: AI service không phản hồi

\`\`\`bash
# Kiểm tra AI service đang chạy
curl http://localhost:8000/health

# Kiểm tra logs AI
cd ai
source venv/bin/activate
python api/main.py
\`\`\`

## 9. Demo Scenarios

### Scenario 1: Đăng ký user mới
1. Frontend: Đăng ký với 10 ảnh
2. Backend: Lưu user + 10 ảnh vào DB
3. AI: Extract 10 embeddings
4. Admin: Phê duyệt user
5. User: Login thành công

### Scenario 2: Xác thực khuôn mặt
1. ESP32-CAM: Chụp ảnh
2. ESP32: Gửi ảnh qua MQTT
3. Backend: Nhận ảnh, gọi AI service
4. AI: So sánh với embeddings
5. Backend: Nếu match → Mở khóa tủ
6. Backend: Log access log

### Scenario 3: Admin quản lý users
1. Login với tài khoản admin
2. Truy cập `/admin/users`
3. Xem danh sách users
4. Edit/Delete user
5. Xem access logs

## 10. Performance Testing

### Load test registration:

\`\`\`bash
# Tạo 10 users đồng thời (cần tool như Apache Bench)
ab -n 10 -c 5 -p register_data.json -T application/json \
   http://localhost:3001/api/users/register
\`\`\`

### Measure face verification time:

\`\`\`bash
time curl -X POST http://localhost:3001/api/face/verify \
  -F "image=@test.jpg"
\`\`\`

**Mục tiêu:** < 2 giây cho mỗi verification

## 11. Test qua LAN (Local Network)

### 11.1. Tìm IP máy chủ

**Windows:**
\`\`\`bash
ipconfig
# Tìm IPv4 Address, ví dụ: 192.168.1.100
\`\`\`

**Linux/Mac:**
\`\`\`bash
ifconfig
# hoặc
ip addr show
# Tìm inet, ví dụ: 192.168.1.100
\`\`\`

### 11.2. Cấu hình Backend cho LAN

**Sửa be/src/index.js:**
\`\`\`javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`LAN access: http://192.168.1.100:${PORT}`);
});
\`\`\`

**Cập nhật be/.env:**
\`\`\`env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_cabinet
JWT_SECRET=your-secret-key
AI_SERVICE_URL=http://192.168.1.100:8000
MQTT_BROKER=mqtt://192.168.1.100:1883
\`\`\`

### 11.3. Cấu hình Frontend cho LAN

**Tạo fe/.env.local:**
\`\`\`env
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000
NEXT_PUBLIC_MQTT_BROKER=ws://192.168.1.100:9001
\`\`\`

**Khởi động frontend:**
\`\`\`bash
cd fe
npm run dev -- -H 0.0.0.0
\`\`\`

Frontend sẽ accessible tại: `http://192.168.1.100:3000`

### 11.4. Cấu hình AI Service cho LAN

**Khởi động AI với bind 0.0.0.0:**
\`\`\`bash
cd ai
source venv/bin/activate  # Linux/Mac
# hoặc venv\Scripts\activate  # Windows

uvicorn api.main:app --host 0.0.0.0 --port 8000
\`\`\`

### 11.5. Cấu hình MQTT Broker cho LAN

**Sửa mosquitto.conf:**
\`\`\`conf
# /etc/mosquitto/mosquitto.conf (Linux)
# C:\Program Files\mosquitto\mosquitto.conf (Windows)

listener 1883 0.0.0.0
allow_anonymous true

# WebSocket support (cho frontend)
listener 9001
protocol websockets
\`\`\`

**Restart Mosquitto:**
\`\`\`bash
# Linux
sudo systemctl restart mosquitto

# Windows
net stop mosquitto
net start mosquitto
\`\`\`

### 11.6. Test từ thiết bị khác trong LAN

**Từ điện thoại/laptop khác:**

1. **Kết nối cùng WiFi** với máy chủ

2. **Test Backend API:**
\`\`\`bash
curl http://192.168.1.100:5000/health
\`\`\`

3. **Mở Frontend:**
\`\`\`
http://192.168.1.100:3000
\`\`\`

4. **Test MQTT:**
\`\`\`bash
mosquitto_sub -h 192.168.1.100 -t "cabinet/#" -v
\`\`\`

### 11.7. Cấu hình ESP32 cho LAN

**esp32/config.h:**
\`\`\`cpp
// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server endpoints (dùng IP LAN)
const char* serverUrl = "http://192.168.1.100:5000/api/face/verify-esp32";
const char* mqttServer = "192.168.1.100";
const int mqttPort = 1883;

// Cabinet info
const char* cabinetId = "CAB001";
\`\`\`

### 11.8. Test ESP32 Face Recognition qua LAN

**Bước 1: Upload code lên ESP32**
\`\`\`bash
# Arduino IDE: Tools > Port > Select ESP32 port
# Click Upload
\`\`\`

**Bước 2: Monitor Serial Output**
\`\`\`
Connecting to WiFi...
WiFi connected! IP: 192.168.1.200
Connecting to MQTT broker...
MQTT connected!
Subscribed to: cabinet/CAB001/control
Camera initialized
Ready to capture faces
\`\`\`

**Bước 3: Test face recognition**
1. Đứng trước ESP32-CAM
2. ESP32 tự động chụp ảnh
3. Gửi lên backend qua HTTP POST
4. Backend gọi AI service verify
5. Nếu match -> Backend publish MQTT unlock
6. ESP32 nhận lệnh, mở servo motor

**Kiểm tra logs backend:**
\`\`\`
POST /api/face/verify-esp32
Body: { cabinetId: 'CAB001', image: 'base64...' }
Calling AI service...
Face matched! User ID: 1, Confidence: 87.3%
Publishing MQTT: cabinet/CAB001/unlock
Access log saved
\`\`\`

### 11.9. Test Remote Unlock từ điện thoại

1. Mở `http://192.168.1.100:3000` trên điện thoại
2. Login với tài khoản user
3. Vào trang "Tủ của tôi"
4. Click nút "Mở khóa" trên card tủ
5. ESP32 sẽ nhận lệnh MQTT và mở tủ

**Monitor MQTT messages:**
\`\`\`bash
mosquitto_sub -h 192.168.1.100 -t "#" -v
\`\`\`

**Output:**
\`\`\`
cabinet/CAB001/control {"action":"unlock","userId":1}
cabinet/CAB001/status {"lockStatus":"unlocked","timestamp":"2025-01-06T10:30:00Z"}
\`\`\`

### 11.10. Firewall Settings

**Windows Firewall:**
\`\`\`powershell
# Mở ports cho backend, AI, MQTT
netsh advfirewall firewall add rule name="Smart Cabinet Backend" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="Smart Cabinet AI" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="MQTT" dir=in action=allow protocol=TCP localport=1883
netsh advfirewall firewall add rule name="MQTT WebSocket" dir=in action=allow protocol=TCP localport=9001
\`\`\`

**Linux UFW:**
\`\`\`bash
sudo ufw allow 5000/tcp   # Backend
sudo ufw allow 8000/tcp   # AI Service
sudo ufw allow 1883/tcp   # MQTT
sudo ufw allow 9001/tcp   # MQTT WebSocket
sudo ufw reload
\`\`\`

## 12. Complete LAN Testing Checklist

### Setup Phase:
- [ ] Tìm IP máy chủ (192.168.1.100)
- [ ] Cấu hình Backend listen 0.0.0.0
- [ ] Cấu hình Frontend .env.local với IP LAN
- [ ] Cấu hình AI Service bind 0.0.0.0
- [ ] Cấu hình Mosquitto listener 0.0.0.0
- [ ] Mở firewall ports: 5000, 8000, 1883, 9001
- [ ] Upload code ESP32 với IP LAN

### Testing Phase:
- [ ] Test backend health: `curl http://192.168.1.100:5000/health`
- [ ] Test AI service: `curl http://192.168.1.100:8000/health`
- [ ] Test MQTT: `mosquitto_sub -h 192.168.1.100 -t "#"`
- [ ] Mở frontend từ điện thoại: `http://192.168.1.100:3000`
- [ ] Đăng ký user mới với webcam điện thoại
- [ ] Login thành công
- [ ] Thêm tủ mới
- [ ] ESP32 kết nối MQTT thành công
- [ ] Test face recognition từ ESP32
- [ ] Test remote unlock từ điện thoại
- [ ] Xem access logs
- [ ] Test unauthorized access alert

## 13. Performance Benchmarks (LAN)

### Network Latency:
\`\`\`bash
ping 192.168.1.100
# Expected: < 5ms trong LAN
\`\`\`

### API Response Time:
\`\`\`bash
time curl http://192.168.1.100:5000/api/cabinets/my
# Expected: < 200ms
\`\`\`

### Face Verification Time:
\`\`\`bash
time curl -X POST http://192.168.1.100:5000/api/face/verify \
  -F "image=@test.jpg"
# Expected: < 3s (bao gồm AI processing)
\`\`\`

### MQTT Message Latency:
\`\`\`bash
# Terminal 1: Subscribe
mosquitto_sub -h 192.168.1.100 -t "test" -v

# Terminal 2: Publish and measure
time mosquitto_pub -h 192.168.1.100 -t "test" -m "hello"
# Expected: < 50ms
\`\`\`

## 14. Troubleshooting LAN Issues

### Issue: Không kết nối được từ thiết bị khác

**Solution:**
1. Kiểm tra cùng WiFi network:
\`\`\`bash
# Máy chủ
ip addr show

# Thiết bị test
ip addr show  # hoặc ipconfig trên Windows
\`\`\`

2. Ping test:
\`\`\`bash
ping 192.168.1.100
\`\`\`

3. Kiểm tra firewall:
\`\`\`bash
# Linux
sudo ufw status

# Windows
Get-NetFirewallRule | Where-Object {$_.Enabled -eq 'True'}
\`\`\`

### Issue: ESP32 không gửi được ảnh lên backend

**Solution:**
1. Kiểm tra ESP32 logs:
\`\`\`
Connected to WiFi
IP: 192.168.1.200
Sending image to: http://192.168.1.100:5000/api/face/verify-esp32
HTTP POST failed: Connection refused
\`\`\`

2. Kiểm tra backend có listen 0.0.0.0:
\`\`\`javascript
// be/src/index.js
app.listen(PORT, '0.0.0.0', () => { ... });
\`\`\`

3. Test endpoint từ ESP32 IP:
\`\`\`bash
curl -X POST http://192.168.1.100:5000/api/face/verify-esp32 \
  -H "Content-Type: application/json" \
  -d '{"cabinetId":"CAB001","image":"test"}'
\`\`\`

### Issue: MQTT không nhận được messages

**Solution:**
1. Kiểm tra Mosquitto config:
\`\`\`conf
listener 1883 0.0.0.0
allow_anonymous true
\`\`\`

2. Test MQTT từ thiết bị khác:
\`\`\`bash
mosquitto_pub -h 192.168.1.100 -t "test" -m "hello" -d
\`\`\`

3. Kiểm tra port 1883 có open:
\`\`\`bash
# Linux
sudo netstat -tulpn | grep 1883

# Windows
netstat -an | findstr 1883
\`\`\`

**Tóm tắt:** Hệ thống Smart Cabinet có thể test hoàn toàn trên LAN bằng cách thay đổi tất cả localhost/127.0.0.1 thành IP LAN của máy chủ (ví dụ 192.168.1.100), cấu hình services bind 0.0.0.0, mở firewall ports cần thiết, và đảm bảo tất cả thiết bị (máy chủ, điện thoại, ESP32) kết nối cùng WiFi network.
