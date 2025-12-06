# Smart Cabinet - Hệ thống Tủ Thông Minh IoT

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Kiến trúc
- **Frontend (fe/)**: Next.js 15 + React + TypeScript + Tailwind CSS
- **Backend (be/)**: Node.js + Express + MySQL
- **AI Service (ai/)**: Python + FastAPI + FaceNet
- **Hardware**: ESP32-CAM + Servo Motor + MQTT

### 1.2 Chức năng chính
✅ **Đăng ký người dùng với nhận diện khuôn mặt** (5-20 ảnh)
✅ **Đăng nhập** (username/password)
✅ **Quản lý tủ** (thêm, sửa, xóa, mở/khóa từ xa)
✅ **Nhận diện khuôn mặt realtime** từ ESP32-CAM
✅ **Cảnh báo truy cập trái phép** qua MQTT
✅ **Lịch sử truy cập** với chi tiết đầy đủ
✅ **Dashboard riêng** cho Admin và User
✅ **Phân quyền** Admin/User
✅ **Pairing ESP32** với tủ

---

## 2. CẤU TRÚC DATABASE

### Bảng users
\`\`\`sql
- user_id (INT, PK, AUTO_INCREMENT)
- username (VARCHAR, UNIQUE)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- full_name (VARCHAR)
- role (ENUM: 'admin', 'user')
- image_url (TEXT)
- created_at (TIMESTAMP)
\`\`\`

### Bảng user_face_images
\`\`\`sql
- image_id (INT, PK, AUTO_INCREMENT)
- user_id (INT, FK)
- image_path (VARCHAR)
- uploaded_at (TIMESTAMP)
\`\`\`

### Bảng face_embeddings
\`\`\`sql
- embedding_id (INT, PK, AUTO_INCREMENT)
- user_id (INT, FK)
- embedding (JSON) -- Vector 128 chiều
- created_at (TIMESTAMP)
\`\`\`

### Bảng cabinets
\`\`\`sql
- cabinet_id (VARCHAR, PK)
- name (VARCHAR)
- location (VARCHAR)
- owner_id (INT, FK -> users)
- lock_status (ENUM: 'locked', 'unlocked')
- is_online (BOOLEAN)
- created_at (TIMESTAMP)
\`\`\`

### Bảng access_logs
\`\`\`sql
- log_id (INT, PK, AUTO_INCREMENT)
- user_id (INT, FK, NULL nếu truy cập thất bại)
- cabinet_id (VARCHAR, FK)
- success (BOOLEAN)
- confidence (FLOAT)
- timestamp (TIMESTAMP)
- image_path (VARCHAR)
\`\`\`

### Bảng device_pairings
\`\`\`sql
- pairing_id (INT, PK, AUTO_INCREMENT)
- cabinet_id (VARCHAR, FK)
- esp32_mac (VARCHAR)
- paired_at (TIMESTAMP)
\`\`\`

---

## 3. LUỒNG HOẠT ĐỘNG CHI TIẾT

### 3.1 Đăng ký người dùng (Registration Flow)
\`\`\`
1. User điền form: username, full_name, email, password
2. User bật webcam và chụp 5-20 ảnh khuôn mặt
3. Frontend gửi FormData lên POST /api/users/register
   - Body: { username, email, password, fullName, images[] }
4. Backend:
   a. Hash password bằng bcrypt (10 rounds)
   b. Insert user vào bảng users
   c. Lưu images vào /uploads/{user_id}/
   d. Insert vào user_face_images
   e. Gọi AI service: POST /api/extract-embedding
      - AI trả về embeddings (vector 128 chiều)
   f. Insert embeddings vào face_embeddings
5. Response: { success, userId, message }
6. Frontend redirect đến /login
\`\`\`

### 3.2 Đăng nhập (Login Flow)
\`\`\`
1. User nhập username + password
2. Frontend gửi POST /api/auth/login
3. Backend:
   a. Query user từ database
   b. So sánh password hash bằng bcrypt.compare()
   c. Tạo JWT token (expires 7d)
   d. Set cookie: token, userId, role
4. Response: { token, user: { id, username, role } }
5. Frontend:
   - Lưu vào localStorage
   - Redirect: admin -> /dashboard, user -> /my-cabinets
\`\`\`

### 3.3 Nhận diện khuôn mặt từ ESP32 (Face Recognition Flow)
\`\`\`
1. ESP32-CAM chụp ảnh khi phát hiện chuyển động
2. ESP32 gửi ảnh qua HTTP POST /api/face/verify-esp32
   Body: { cabinetId, image: base64 }
3. Backend:
   a. Decode base64 -> save temp image
   b. Gọi AI service: POST /api/verify-face
      - AI extract embedding từ ảnh
      - So sánh với tất cả embeddings trong DB
      - Tính cosine similarity
   c. Nếu similarity > 0.7 -> Match found
      - Lưu access_log (success=1, user_id, confidence)
      - Publish MQTT: cabinet/{cabinetId}/unlock
      - ESP32 nhận lệnh -> mở servo motor
   d. Nếu similarity < 0.7 -> Unauthorized
      - Lưu access_log (success=0, user_id=NULL)
      - Publish MQTT: alert/{ownerId}/unauthorized
      - Frontend nhận alert realtime
4. Response: { success, userId, confidence }
\`\`\`

### 3.4 Mở tủ từ xa (Remote Unlock Flow)
\`\`\`
1. User/Admin vào trang "Tủ của tôi"
2. Click nút "Mở khóa" trên card tủ
3. Frontend gọi POST /api/cabinets/{cabinetId}/unlock
4. Backend:
   a. Kiểm tra quyền: user phải là owner_id hoặc admin
   b. Update cabinets: lock_status='unlocked'
   c. Publish MQTT: cabinet/{cabinetId}/control
      Payload: { action: "unlock", userId }
   d. Insert access_log (success=1, source="remote")
5. ESP32 subscribe topic, nhận lệnh, mở servo
6. ESP32 tự động đóng sau 5s, publish status back
7. Backend update lock_status='locked'
\`\`\`

### 3.5 Cảnh báo truy cập trái phép (Unauthorized Access Alert)
\`\`\`
1. Khi face recognition fail (similarity < 0.7)
2. Backend:
   a. Lưu access_log với success=0, image_path
   b. Query owner_id từ cabinets
   c. Publish MQTT: alert/{ownerId}/unauthorized
      Payload: { cabinetId, timestamp, imageUrl }
3. Frontend (nếu user đang online):
   a. MQTT client subscribe alert/{currentUserId}/*
   b. Nhận alert -> show toast notification
   c. Redirect đến /alerts
4. Trang Alerts:
   - Hiển thị danh sách access_logs (success=0)
   - Show ảnh người lạ, thời gian, tủ bị truy cập
   - Nút "Đánh dấu đã đọc"
\`\`\`

---

## 4. API ENDPOINTS

### 4.1 Authentication
\`\`\`
POST /api/auth/login
- Body: { username, password }
- Response: { token, user }

POST /api/auth/logout
- Headers: Authorization: Bearer {token}
- Response: { success }
\`\`\`

### 4.2 Users
\`\`\`
POST /api/users/register
- Body: FormData { username, email, password, fullName, images[] }
- Response: { success, userId }

GET /api/users
- Headers: Authorization (Admin only)
- Response: { users: [...] }

GET /api/users/:id
- Response: { user }

PUT /api/users/:id
- Body: { username?, email?, role? }
- Response: { success }

DELETE /api/users/:id
- Admin only
- Response: { success }

POST /api/users/:id/change-password
- Body: { currentPassword, newPassword }
- Response: { success }
\`\`\`

### 4.3 Cabinets
\`\`\`
GET /api/cabinets
- Response: { cabinets: [...] }

GET /api/cabinets/my
- Headers: Authorization
- Response: { cabinets: [...] } (filtered by owner_id)

POST /api/cabinets
- Body: { cabinetId, name, location }
- Response: { success, cabinet }

PUT /api/cabinets/:id
- Body: { name?, location?, ownerId? }
- Response: { success }

POST /api/cabinets/:id/unlock
- Headers: Authorization
- Response: { success }

POST /api/cabinets/:id/lock
- Headers: Authorization
- Response: { success }

POST /api/cabinets/:id/pair
- Body: { esp32Mac }
- Response: { success, pairingCode }
\`\`\`

### 4.4 Face Recognition
\`\`\`
POST /api/face/verify-esp32
- Body: { cabinetId, image: base64 }
- Response: { success, userId?, confidence }

POST /api/face/verify
- Body: FormData { image }
- Response: { userId, confidence }
\`\`\`

### 4.5 Access Logs
\`\`\`
GET /api/logs
- Query: ?cabinetId=xxx&userId=yyy&startDate=...
- Response: { logs: [...] }

GET /api/logs/unauthorized
- Headers: Authorization
- Response: { logs: [...] } (success=0 only)
\`\`\`

### 4.6 Alerts
\`\`\`
GET /api/alerts
- Headers: Authorization
- Response: { alerts: [...] }

PUT /api/alerts/:id/read
- Response: { success }
\`\`\`

---

## 5. AI SERVICE ENDPOINTS

\`\`\`python
POST /api/extract-embedding
- Body: { images: [base64_str, ...] }
- Response: { embeddings: [[128 floats], ...] }

POST /api/verify-face
- Body: { image: base64_str, embeddings: [...] }
- Response: { matched: bool, userId: int, confidence: float }

GET /health
- Response: { status: "ok" }
\`\`\`

---

## 6. MQTT TOPICS

### Subscribe (ESP32)
\`\`\`
cabinet/{cabinetId}/control
- Payload: { action: "unlock" | "lock", userId }

cabinet/{cabinetId}/status
- Payload: { online: bool, lockStatus: "locked" | "unlocked" }
\`\`\`

### Publish (ESP32)
\`\`\`
cabinet/{cabinetId}/status
- Khi ESP32 boot hoặc thay đổi trạng thái
- Payload: { online: true, lockStatus, timestamp }

esp32/pair
- Khi ESP32 chưa pair, broadcast MAC address
- Payload: { mac, timestamp }
\`\`\`

### Publish (Backend)
\`\`\`
cabinet/{cabinetId}/unlock
cabinet/{cabinetId}/lock
alert/{userId}/unauthorized
- Payload: { cabinetId, timestamp, imageUrl }
\`\`\`

---

## 7. FRONTEND ROUTES

### Public Routes
\`\`\`
/               -> Landing page (redirect to /login)
/login          -> Login form
/register       -> Registration form with webcam
\`\`\`

### User Routes (Protected)
\`\`\`
/dashboard      -> User dashboard (overview tủ của mình)
/my-cabinets    -> Quản lý tủ (thêm, mở/khóa, xem status)
/history        -> Lịch sử truy cập tủ của mình
/alerts         -> Cảnh báo truy cập trái phép
/profile        -> Hồ sơ cá nhân, đổi mật khẩu, avatar
\`\`\`

### Admin Routes (Protected)
\`\`\`
/dashboard          -> Admin dashboard (stats toàn hệ thống)
/admin/users        -> Quản lý users (CRUD, approve)
/admin/devices      -> Quản lý ESP32 devices (pairing, status)
/admin/settings     -> Cài đặt hệ thống (DB, MQTT, notifications)
/history            -> Toàn bộ access logs
\`\`\`

---

## 8. CHỨC NĂNG ADMIN/SETTINGS

Trang **Admin Settings** dùng để:

### 8.1 Cấu hình Database
- Host, Port, Database Name
- (Hiện tại chỉ hiển thị, chưa lưu được)

### 8.2 Cấu hình MQTT Broker
- MQTT Host, Port, Username, Password
- Test connection

### 8.3 Cảnh báo & Thông báo
- Bật/tắt email notifications
- Bật/tắt push notifications
- (Hiện tại chỉ UI placeholder)

**TODO**: Thêm backend API để lưu settings vào bảng `system_settings`

---

## 9. HƯỚNG DẪN TESTING

### 9.1 Test Local (Localhost)

#### Bước 1: Khởi động Backend
\`\`\`bash
cd be
npm install
# Tạo file .env
echo "DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_cabinet
JWT_SECRET=your-secret-key-here
AI_SERVICE_URL=http://localhost:8000
MQTT_BROKER=mqtt://localhost:1883" > .env

npm start
# Backend chạy tại http://localhost:5000
\`\`\`

#### Bước 2: Khởi động AI Service
\`\`\`bash
cd ai
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000
# AI service chạy tại http://localhost:8000
\`\`\`

#### Bước 3: Khởi động Frontend
\`\`\`bash
cd fe
npm install
# Tạo .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_MQTT_BROKER=ws://localhost:9001" > .env.local

npm run dev
# Frontend chạy tại http://localhost:3000
\`\`\`

#### Bước 4: Setup MQTT Broker (Mosquitto)
\`\`\`bash
# Ubuntu/Debian
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto

# Windows: Download từ https://mosquitto.org/download/
# Chạy mosquitto -v
\`\`\`

#### Bước 5: Test chức năng
\`\`\`
1. Mở http://localhost:3000/register
2. Đăng ký user mới với webcam (chụp 5-20 ảnh)
3. Login tại /login
4. Thêm tủ tại /my-cabinets
5. Test mở tủ từ xa
\`\`\`

---

### 9.2 Test qua LAN (Local Network)

#### Bước 1: Tìm IP máy tính
\`\`\`bash
# Windows
ipconfig
# Tìm IPv4 Address, ví dụ: 192.168.1.100

# Linux/Mac
ifconfig
# hoặc
ip addr show
\`\`\`

#### Bước 2: Sửa Backend để listen trên 0.0.0.0
\`\`\`javascript
// be/src/index.js
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
\`\`\`

#### Bước 3: Cập nhật Frontend .env
\`\`\`bash
# fe/.env.local
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000
NEXT_PUBLIC_MQTT_BROKER=ws://192.168.1.100:9001
\`\`\`

#### Bước 4: Cấu hình ESP32
\`\`\`cpp
// esp32/config.h
const char* serverUrl = "http://192.168.1.100:5000/api/face/verify-esp32";
const char* mqttServer = "192.168.1.100";
const int mqttPort = 1883;
\`\`\`

#### Bước 5: Test từ thiết bị khác
\`\`\`
1. Trên điện thoại/laptop khác trong cùng WiFi
2. Mở trình duyệt: http://192.168.1.100:3000
3. Đăng ký/đăng nhập bình thường
4. ESP32 kết nối cùng WiFi, test nhận diện khuôn mặt
\`\`\`

#### Bước 6: Test MQTT
\`\`\`bash
# Terminal 1: Subscribe
mosquitto_sub -h 192.168.1.100 -t "cabinet/#" -v

# Terminal 2: Publish test
mosquitto_pub -h 192.168.1.100 -t "cabinet/CAB001/control" -m '{"action":"unlock"}'
\`\`\`

---

### 9.3 Test Cases Chi Tiết

#### TC1: Đăng ký người dùng
\`\`\`
Điều kiện: Chưa có user trong DB
Bước:
1. Vào /register
2. Điền: username="testuser", email="test@test.com", password="123456", fullName="Test User"
3. Cho phép camera
4. Chụp 10 ảnh khuôn mặt (góc khác nhau)
5. Click "Đăng ký"

Kết quả mong đợi:
- Hiển thị "Đăng ký thành công"
- Database có 1 user mới
- Có 10 records trong user_face_images
- Có 10 embeddings trong face_embeddings
- Redirect về /login
\`\`\`

#### TC2: Đăng nhập
\`\`\`
Điều kiện: Đã có user "testuser"
Bước:
1. Vào /login
2. Nhập username="testuser", password="123456"
3. Click "Đăng nhập"

Kết quả mong đợi:
- Hiển thị "Đăng nhập thành công"
- Set cookie: token, userId, role
- Redirect về /my-cabinets (nếu user) hoặc /dashboard (nếu admin)
\`\`\`

#### TC3: Thêm tủ mới
\`\`\`
Điều kiện: Đã login
Bước:
1. Vào /my-cabinets
2. Click "Thêm tủ mới"
3. Điền: cabinetId="CAB001", name="Tủ phòng 101", location="Tầng 1"
4. Click "Thêm"

Kết quả mong đợi:
- Database có record mới trong cabinets
- owner_id = currentUserId
- Hiển thị card tủ mới trên UI
- Status: offline (chưa có ESP32 pair)
\`\`\`

#### TC4: Mở tủ từ xa
\`\`\`
Điều kiện: Đã có tủ CAB001, ESP32 đã pair và online
Bước:
1. Vào /my-cabinets
2. Thấy card tủ CAB001, status "locked"
3. Click nút "Mở khóa"

Kết quả mong đợi:
- Backend gọi MQTT publish: cabinet/CAB001/control
- ESP32 nhận lệnh, mở servo motor
- UI cập nhật status -> "unlocked"
- Sau 5s tự động lock lại
- Database có access_log (success=1, source="remote")
\`\`\`

#### TC5: Nhận diện khuôn mặt từ ESP32
\`\`\`
Điều kiện: ESP32 online, đã pair với CAB001
Bước:
1. Đứng trước ESP32-CAM
2. ESP32 tự động chụp ảnh, gửi lên backend

Kết quả mong đợi (nếu là user đã đăng ký):
- AI service trả về confidence > 0.7
- Backend lưu access_log (success=1, user_id, confidence)
- ESP32 nhận lệnh unlock, mở tủ
- Frontend (nếu user đang online) thấy notification

Kết quả mong đợi (nếu là người lạ):
- AI service trả về confidence < 0.7
- Backend lưu access_log (success=0, image_path)
- MQTT publish alert/{ownerId}/unauthorized
- Frontend hiển thị cảnh báo realtime
- Admin/owner thấy ảnh người lạ trong /alerts
\`\`\`

#### TC6: Xem lịch sử truy cập
\`\`\`
Điều kiện: Đã có access_logs
Bước:
1. Vào /history
2. Xem danh sách

Kết quả mong đợi:
- Hiển thị bảng: Time, User, Cabinet, Status, Confidence, Image
- Filter được theo: Date range, Cabinet, Success/Fail
- Admin thấy tất cả, User chỉ thấy tủ của mình
\`\`\`

#### TC7: Pairing ESP32 với tủ
\`\`\`
Điều kiện: ESP32 đã nạp code, chạy WiFi
Bước:
1. ESP32 boot lần đầu, chưa có cabinetId
2. ESP32 publish MQTT: esp32/pair { mac: "XX:XX:XX:XX:XX:XX" }
3. Admin vào /admin/devices
4. Thấy ESP32 mới, click "Pair"
5. Chọn tủ CAB001, click "Xác nhận"

Kết quả mong đợi:
- Backend lưu device_pairings (cabinet_id, esp32_mac)
- Backend publish: esp32/{mac}/config { cabinetId: "CAB001" }
- ESP32 nhận config, lưu vào EEPROM
- ESP32 reboot, bắt đầu hoạt động bình thường
\`\`\`

---

## 10. FILE CẤU TRÚC

\`\`\`
smart-cabinet/
├── be/                     # Backend Node.js
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       # Auto-create tables
│   │   ├── controllers/
│   │   │   ├── userController.js
│   │   │   ├── cabinetController.js
│   │   │   ├── accessLogController.js
│   │   │   └── ...
│   │   ├── routes/
│   │   │   ├── users.js
│   │   │   ├── cabinets.js
│   │   │   ├── auth.js
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT verification
│   │   ├── services/
│   │   │   ├── face.js           # Call AI service
│   │   │   └── mqtt.js           # MQTT client
│   │   └── index.js              # Main app
│   ├── uploads/                  # User images, access logs
│   ├── .env
│   ├── .gitignore
│   └── package.json
│
├── fe/                     # Frontend Next.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   ├── my-cabinets/
│   │   ├── history/
│   │   ├── alerts/
│   │   ├── profile/
│   │   └── admin/
│   │       ├── users/
│   │       ├── devices/
│   │       └── settings/
│   ├── components/
│   │   ├── dashboard-layout.tsx
│   │   └── ui/
│   ├── lib/
│   │   └── api.ts                # API client
│   ├── .env.local
│   ├── .gitignore
│   └── package.json
│
├── ai/                     # AI Service Python
│   ├── api/
│   │   └── main.py               # FastAPI app
│   ├── routers/
│   │   ├── register.py           # Extract embeddings
│   │   └── verify.py             # Verify face
│   ├── models/
│   │   └── facenet.py            # FaceNet model
│   ├── requirements.txt
│   ├── .env
│   └── .gitignore
│
├── esp32/                  # ESP32-CAM Firmware
│   ├── esp32_cam.ino
│   └── config.h
│
├── scripts/
│   └── 01-create-database.sql    # Backup SQL
│
├── .gitignore
├── README.md
└── SYSTEM_DOCUMENTATION.md       # File này
\`\`\`

---

## 11. MÔ TẢ GITIGNORE

### Root .gitignore
- **node_modules/** - Dependencies (không commit)
- **.env, .env.local** - Secrets (KHÔNG BAO GIỜ commit)
- **/dist, /build, /.next/** - Build outputs
- **logs/, *.log** - Log files
- **.DS_Store, Thumbs.db** - OS files
- **uploads/** - User uploaded images (quá lớn)

### be/.gitignore
- **uploads/** - Ảnh người dùng, access logs (chỉ lưu local)
- **.env** - Database credentials, JWT secret

### ai/.gitignore
- **__pycache__/** - Python compiled files
- **venv/** - Virtual environment
- **models/, weights/** - Pre-trained models (quá lớn)

---

## 12. LƯU Ý QUAN TRỌNG

### 12.1 Security
- ✅ KHÔNG commit .env files
- ✅ Password được hash bằng bcrypt (10 rounds)
- ✅ JWT token expires sau 7 ngày
- ✅ Middleware auth kiểm tra token trên mọi protected routes
- ⚠️ TODO: Thêm rate limiting cho /api/auth/login
- ⚠️ TODO: HTTPS cho production

### 12.2 Performance
- ✅ Face embeddings được cache trong DB (không tính lại)
- ✅ MQTT sử dụng QoS 1 (đảm bảo delivery)
- ⚠️ TODO: Redis cache cho user sessions
- ⚠️ TODO: CDN cho static images

### 12.3 Scalability
- ⚠️ Database hiện tại: MySQL single instance
- ⚠️ TODO: Connection pooling
- ⚠️ TODO: Load balancer cho multiple backend instances
- ⚠️ TODO: Separate AI service thành microservice

---

## 13. TROUBLESHOOTING

### Lỗi: Cannot connect to database
\`\`\`
Kiểm tra:
1. MySQL đã chạy chưa? `mysql -u root -p`
2. Database 'smart_cabinet' đã tạo chưa?
3. .env có đúng credentials?
\`\`\`

### Lỗi: AI service 404
\`\`\`
Kiểm tra:
1. AI service đã chạy? `curl http://localhost:8000/health`
2. be/.env có AI_SERVICE_URL đúng?
3. Python dependencies đã cài? `pip install -r ai/requirements.txt`
\`\`\`

### Lỗi: MQTT connection refused
\`\`\`
Kiểm tra:
1. Mosquitto đã chạy? `sudo systemctl status mosquitto`
2. Port 1883 có mở không? `netstat -an | grep 1883`
3. Firewall có block không?
\`\`\`

### ESP32 không kết nối được backend
\`\`\`
Kiểm tra:
1. ESP32 và máy tính cùng WiFi?
2. IP address trong esp32/config.h đúng?
3. Backend listen trên 0.0.0.0 (không phải 127.0.0.1)?
\`\`\`

---

## 14. ROADMAP

### Phase 1: Core Features (DONE) ✅
- User registration với face recognition
- Login/logout
- Cabinet management
- Remote unlock
- Access logs
- Unauthorized alerts

### Phase 2: Enhancements (TODO)
- [ ] Email notifications
- [ ] Push notifications (Web Push API)
- [ ] Mobile app (React Native)
- [ ] Multiple face support (nhận diện nhiều người cùng lúc)
- [ ] Face anti-spoofing (chống ảnh/video giả)

### Phase 3: Production Ready (TODO)
- [ ] HTTPS + SSL certificates
- [ ] Rate limiting & DDoS protection
- [ ] Redis caching
- [ ] Database backup automation
- [ ] Monitoring & logging (ELK stack)
- [ ] CI/CD pipeline

---
