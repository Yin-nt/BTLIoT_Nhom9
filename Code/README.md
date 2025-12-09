# 🔐 Smart Cabinet System - Hệ Thống Tủ Thông Minh Mở bằng Camera ESP32-CAM

## Giới thiệu
- **Tên đề tài:** Hệ thống Tủ thông minh mở bằng camera ESP32-CAM & AI nhận diện khuôn mặt
- **Lĩnh vực:** IoT – Trí tuệ nhân tạo – Ứng dụng Web – Nhúng
- Dự án IoT sử dụng ESP32-CAM để nhận diện khuôn mặt và mở tủ tự động. Hệ thống giúp tăng tính bảo mật và tiện lợi cho người dùng, với các chức năng chính:
    - ✅ Nhận diện khuôn mặt để mở tủ (AI-powered với YOLOFace + ArcFace).
    - ✅ Đăng ký với 5-20 ảnh, xác thực chỉ cần 1 ảnh.
    - ✅ Điều khiển và giám sát từ xa qua web dashboard.
    - ✅ Cảnh báo an ninh tự động (truy cập trái phép, tamper detection).
    - ✅ Quản lý người dùng, quyền truy cập và lịch sử truy cập chi tiết.
    - ✅ Tích hợp MQTT cho real-time communication.

- Hệ thống tách thành 3 services độc lập: **Backend (Node.js)**, **AI Service (Python)**, và **Frontend (Next.js)**, kết hợp với hardware ESP32-CAM.

**Contributors: Team 6**
- Trần Mai Hương (B22DCCN424)
- Nguyễn Thị Khánh Vân (B22DCCN892)
- Nguyễn Nam Vũ (B22DCCN916)
- Nguyễn Thị Yến (B22DCCN928)

---

## 📋 Mục Lục
- [Tổng Quan](#tổng-quan)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Database Schema](#database-schema)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt Nhanh (Quick Start)](#cài-đặt-nhanh)
- [Cấu Hình Environment](#cấu-hình-environment)
- [Chạy Dự Án](#chạy-dự-án)
- [MQTT Broker](#mqtt-broker)
- [Tích Hợp AI](#tích-hợp-ai)
- [Thêm và Quản Lý Thiết Bị ESP32](#thêm-và-quản-lý-thiết-bị-esp32)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Demo & Testing](#demo--testing)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

---

## 🎯 Tổng Quan
Hệ thống tủ thông minh cho phép:
- Mở khóa bằng nhận diện khuôn mặt (threshold 0.6).
- Đăng ký người dùng với webcam (5-20 ảnh từ nhiều góc độ).
- Quản lý tủ (thêm/sửa/xóa, remote unlock/lock).
- Giám sát real-time qua MQTT.
- Lưu trữ lịch sử truy cập và cảnh báo.
- Phân quyền Admin/User.

**Luồng Hoạt Động Chính:**
1. **Đăng ký:** Upload ảnh → AI extract embeddings → Lưu DB.
2. **Xác thực:** ESP32 chụp ảnh → Gửi MQTT/HTTP → AI so sánh → Unlock nếu match.
3. **Remote Control:** Web → Backend → MQTT → ESP32 → Điều khiển Servo.

---

## 🏗️ Kiến Trúc Hệ Thống
```
┌─────────────────┐     MQTT       ┌──────────────────┐
│  ESP32-CAM      │ ◄────────────► │  MQTT Broker     │
│  (Device)       │                │  (Mosquitto/     │
│  - Camera       │                │   HiveMQ Cloud)  │
│  - Relay Lock   │                └──────────────────┘
└─────────────────┘                         ▲
       │                                    │
       │ Send image                         │ Pub/Sub
       ▼                                    │
┌─────────────────┐                         │
│  Backend (be/)  │ ◄───────────────────────┘
│  Node.js +      │
│  Express        │        HTTP POST
│  - MQTT Client  │ ────────────────► ┌─────────────────┐
│  - Database     │                   │  AI Service     │
│  - Auth (JWT)   │ ◄──────────────── │  (ai/)          │
└─────────────────┘                   │  - YOLOFace     │
       │                              │  - ArcFace      │
       │ MySQL                        │  FastAPI        │
       ▼                              └─────────────────┘
┌─────────────────┐
│  MySQL Database │
│                 │        HTTP       ┌─────────────────┐
│                 │ ◄────────────────►│  Frontend (fe/) │
│                 │                   │  Next.js        │
│                 │                   │  - Dashboard    │
└─────────────────┘                   │  - User Mgmt    │
                                      └─────────────────┘
```

---

## 📁 Cấu Trúc Dự Án
```
smart-cabinet/
├── be/                          # Backend (Node.js)
│   ├── src/                     # Source code
│   │   ├── config/database.js   # MySQL connection
│   │   ├── services/mqtt.js     # MQTT handlers
│   │   ├── routes/              # API routes (auth, cabinets, face)
│   │   └── middleware/auth.js   # JWT auth
│   ├── uploads/                 # User images (gitignore)
│   ├── .env
│   └── package.json
├── fe/                          # Frontend (Next.js)
│   ├── app/                     # Pages (login, dashboard, admin,...)
│   ├── components/              # UI components
│   ├── lib/api.ts               # API client
│   ├── .env.local
│   └── package.json
├── ai/                          # AI Service (Python)
│   ├── api/main.py              # FastAPI server
│   ├── models/                  # YOLOFace + ArcFace 
|   ├── detector/ 
|   ├── embedder/
|   ├── routers/
|   ├── services/
|   ├── utils/    
│   ├── requirements.txt
│   └── config.yaml
├── esp/                         # ESP32 Firmware
│   └── smart_cabinet_esp32.ino  # Arduino code
└── README.md                    # This file
```

---

## 🛠️ Công Nghệ Sử Dụng
### Hardware
- **ESP32-CAM**: Camera + WiFi.
- **Servo**: Điều khiển khóa.
- **PIR Sensor**: Phát hiện chuyển động.

### Software
- **Backend:** Node.js 18+ + Express + MySQL2 + mqtt.js + bcryptjs + jsonwebtoken.
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS.
- **AI:** Python 3.8+ + FastAPI + ONNX Runtime + YOLOFace + ArcFace.
- **Database:** MySQL 8.0+.
- **MQTT:** Mosquitto (local) / HiveMQ Cloud (prod).

---

## 🗄️ Database Schema
```sql
-- users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NULL COMMENT 'User full name',
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- user_face_images (5-20 ảnh/user)
CREATE TABLE IF NOT EXISTS user_face_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- face_embeddings (512-dim vector per image)
CREATE TABLE IF NOT EXISTS face_embeddings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    image_id INT NOT NULL,
    user_id INT NOT NULL COMMENT 'Reference to user for quick lookup',
    embedding JSON NOT NULL COMMENT '512-dimensional vector from ArcFace',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES user_face_images(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_image_id (image_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cabinets
CREATE TABLE IF NOT EXISTS cabinets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cabinet_id VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique identifier like CAB001',
    name VARCHAR(200) NOT NULL,
    location VARCHAR(300),
    owner_id INT NULL COMMENT 'User who owns this cabinet',
    status ENUM('online', 'offline') DEFAULT 'offline',
    lock_status ENUM('locked', 'unlocked') DEFAULT 'locked',
    last_seen TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cabinet_id (cabinet_id),
    INDEX idx_owner_id (owner_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- access_logs
CREATE TABLE IF NOT EXISTS access_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cabinet_id INT NOT NULL,
    user_id INT NULL COMMENT 'NULL if face not recognized',
    access_type ENUM('face', 'remote', 'manual') NOT NULL,
    success BOOLEAN NOT NULL,
    alert_type ENUM('none', 'unauthorized', 'tamper') DEFAULT 'none',
    image_url VARCHAR(500) NULL COMMENT 'Face verification image',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_cabinet_id (cabinet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_alert_type (alert_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- device_pairings (ESP32 pairing)
CREATE TABLE IF NOT EXISTS device_pairings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pairing_code VARCHAR(20) UNIQUE NOT NULL COMMENT '6-digit pairing code',
    cabinet_id INT NULL COMMENT 'NULL until paired',
    device_mac VARCHAR(50) NULL COMMENT 'ESP32 MAC address',
    expires_at TIMESTAMP NOT NULL,
    paired_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
    INDEX idx_pairing_code (pairing_code),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cabinet_requests
CREATE TABLE IF NOT EXISTS cabinet_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cabinet_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_cabinet_user (cabinet_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🚀 Cài Đặt Nhanh (Quick Start)

### Bước 1: Clone và Install
**Linux/Mac:**
```bash
git clone <your-repo-url>
cd smart-cabinet
cd be && npm install && cd ..
cd fe && npm install && cd ..
cd ai && pip install -r requirements.txt && cd ..
```

**Windows PowerShell:**
```powershell
git clone <your-repo-url>
cd smart-cabinet
cd be; npm install; cd ..
cd fe; npm install; cd ..
cd ai; py -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; cd ..
```
*Lưu ý:* Nếu lỗi execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Bước 2: Setup Database
**Linux/Mac:**
```bash
# Cài MySQL nếu chưa có (Ubuntu: sudo apt install mysql-server; Mac: brew install mysql)
mysql -u root -p -e "CREATE DATABASE smart_cabinet;"
mysql -u root -p smart_cabinet < scripts/01-create-database.sql
mysql -u root -p smart_cabinet < scripts/02-seed-data.sql
```

**Windows:** Sử dụng MySQL Installer hoặc XAMPP, sau đó tương tự.

### Bước 3: Cấu Hình Environment
Xem phần [Cấu Hình Environment](#cấu-hình-environment).

### Bước 4: Chạy Services
Mở 3 terminals:
- **Terminal 1 (Backend):** `cd be; npm run dev` → http://localhost:3001
- **Terminal 2 (AI):** `cd ai; source venv/bin/activate; python api/main.py` (Linux/Mac) hoặc `.\venv\Scripts\Activate.ps1; py api/main.py` (Windows) → http://localhost:8000
- **Terminal 3 (Frontend):** `cd fe; npm run dev` → http://localhost:3000

### Bước 5: Truy Cập và Test
- Mở http://localhost:3000
- Login: `admin` / `admin123`
- Test: Thêm user với webcam, thêm cabinet, xem dashboard.

**Kiểm Tra:**
- Backend: `curl http://localhost:3001/health`
- AI: `curl http://localhost:8000/health`
- DB: `mysql -u root -p smart_cabinet -e "SHOW TABLES;"`

---

## ⚙️ Cấu Hình Environment
### Backend (be/.env)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_cabinet

MQTT_BROKER=mqtt://test.mosquitto.org:1883 # Hoặc HiveMQ Cloud
MQTT_USERNAME=
MQTT_PASSWORD=

AI_SERVICE_URL=http://localhost:8000
JWT_SECRET="your_jwt_secret_here"
FACE_SIMILARITY_THRESHOLD=0.6
PORT=3001
```

### Frontend (fe/.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### AI (ai/config.yaml)
Giữ default (models path, threshold).

**Lưu Ý:** Không commit .env files (gitignore).

---

## ▶️ Chạy Dự Án
Để chạy trên LAN:
- Backend: `app.listen(PORT, '0.0.0.0')`
- Frontend: `npm run dev -- -H 0.0.0.0`
- AI: `uvicorn api.main:app --host 0.0.0.0 --port 8000`
- MQTT: Sửa mosquitto.conf: `listener 1883 0.0.0.0`

Truy cập: http://<LAN_IP>:3000 (ví dụ: 192.168.1.100:3000)

---

## 📡 MQTT Broker
- **Local:** Cài Mosquitto (`sudo apt install mosquitto` Linux; download Windows). 
    + Hoặc sử dụng Mosquitto Explore với Topic `iot/door/control, QoS = 1.`
- **Cloud:** HiveMQ Cloud (miễn phí 100 clients).
- Topics:
  - Publish (ESP32): `cabinet/<device_id>/status` (online/unlocked).
  - Subscribe (ESP32): `cabinet/<device_id>/control` (unlock/lock).
  - Alerts: `alert/<user_id>/unauthorized`.

Test: `mosquitto_pub -h localhost -t "test" -m "hello"`

---

## 🤖 Tích Hợp AI
- Download models vào `ai/models/`: yolov5n-face.pt (YOLOFace). Tải w600k_r50.onnx (ArcFace)về folder models từ https://github.com/yakhyo/face-reidentification/releases/tag/v0.0.1
- Endpoints:
  - POST /api/extract-embedding: {images: [base64]} → {embeddings: [[floats]]}
  - POST /api/verify-face: {image: base64, embeddings: [...]} → {matched: bool, confidence: float}

---

## 🔌 Thêm và Quản Lý Thiết Bị ESP32
### Thêm Thiết Bị Mới
1. Login Admin → Admin > Quản lý Devices > "Add Device".
2. Điền: Device ID (ESP32-XXXXX, unique), Display Name (tùy chọn), Location (bắt buộc).
3. MQTT Topic tự tạo: `cabinet/<device_id>`.

### Kết Nối ESP32
**Phương Pháp Thủ Công:**
- Sửa `esp/config.h`:
  ```cpp
  #define WIFI_SSID "Your_WiFi"
  #define WIFI_PASSWORD "Your_Pass"
  #define MQTT_BROKER "192.168.1.100"
  #define DEVICE_ID "ESP32-11111"  // Phải trùng DB
  #define MQTT_TOPIC "cabinet/esp32-11111"
  #define API_URL "http://192.168.1.100:3001"
  ```
- Upload firmware qua Arduino IDE (Board: ESP32 Dev Module).
- Kiểm tra Serial Monitor (115200 baud): WiFi/MQTT connected → Device Online trên web.

**Pairing Mode (Future):** Click "Pair New Device" → Nhập code 6 số trên ESP32.

### Quản Lý
- Bảng: ID, Device ID, Name, Location, Status (locked/unlocked), Online, Actions (Edit/Delete).
- Edit: Name/Location (không sửa Device ID).
- Delete: Xóa DB + logs.

### Mở/Khóa Từ Xa
- Dashboard/User: Click 🔓 Unlock/🔒 Lock.
- Luồng: Web → Backend POST /unlock → MQTT publish → ESP32 relay → Status update.

### Lỗi Thường Gặp
- Offline: Kiểm tra WiFi/MQTT/Device ID.
- Disconnect: Tăng keepalive (60s), thêm reconnect logic.
- Test LAN: Sử dụng IP thay localhost.

---

## 📚 API Documentation
### Auth
- POST /api/auth/login: {username, password} → {token, user}
- POST /api/auth/logout: Bearer token → {success}

### Users
- POST /api/users/register: FormData {username, email, password, fullName, images[]} → {userId}
- GET /api/users: Bearer token (Admin) → {users: [...]}
- PUT/DELETE /api/users/:id: Admin only.

### Cabinets
- GET /api/cabinets (my): → {cabinets: [...]}
- POST /api/cabinets: {cabinet_id, name, location} → {cabinet}
- POST /api/cabinets/:id/unlock|lock: Bearer token → {success}

### Face
- POST /api/face/verify-esp32: {cabinetId, image: base64} → {success, userId, confidence}
- POST /api/face/verify: FormData {image} → {userId, confidence}

### Access-Logs/Alerts
- GET /api/access-logs?limit=50: → {access-logs: [...]}
- GET /api/alerts: Bearer token → {alerts: [...]}
- POST /api/access-logs/esp32
---

## 🚢 Deployment
### Backend: Railway/Heroku
```bash
cd be; railway init; railway up  # Railway
# Hoặc heroku create; git push heroku main
```

### Frontend: Vercel
```bash
cd fe; vercel --prod
```

### AI: AWS EC2/Docker
- EC2: Launch Ubuntu, clone, venv, systemd service.
- Docker: Build `ai/Dockerfile`, run `-p 5000:5000`.

### MQTT: HiveMQ Cloud (update .env).

**Production Notes:** HTTPS, Redis cache, DB backup.

---

## 🎬 Demo & Testing
### Demo Scenario: Nhân Viên Truy Cập Tủ
1. Đăng ký: User chụp upload 5-20 ảnh → Embeddings lưu DB.
2. Xác thực: ESP32 chụp → AI match (0.87 > 0.6) → Unlock.
3. Remote: Web click Unlock → MQTT → Relay.
4. Unauthorized: Alert toast + access-logs.

### Test Cases
#### TC1: Đăng Ký User
- Bước: /register → Điền form → Chụp 5 ảnh → Submit.
- Kết quả: User pending, 5 images/embeddings lưu DB.

#### TC2: Login
- Bước: /login → username/password.
- Kết quả: Token, redirect dashboard (admin) / my-cabinet (user).

#### TC3: Thêm Tủ
- Bước: /my-cabinets → Add → Điền info (đợi admin duyệt).
- Kết quả: Cabinet lưu DB, owner_id set.

#### TC4: Remote Unlock
- Bước: Click Unlock.
- Kết quả: MQTT publish, status update, log saved.

#### TC5: Face Verification (ESP32)
- Bước: Đứng trước camera.
- Kết quả: Match → Unlock/log; Fail → Alert.

#### TC6: Xem Logs
- Bước: /history → Filter.
- Kết quả: Bảng logs (time, user, status).

#### TC7: Pairing ESP32
- Bước: ESP32 publish MAC → Admin pair.
- Kết quả: Pairing lưu DB, ESP32 config.

**Full Test Commands:**
- Register: `curl -X POST ... -F "images=@face1.jpg" ...`
- Verify: `curl -X POST /api/face/verify -F "image=@test.jpg"`
- MQTT: `mosquitto_pub -t "cabinet/CAB001/verify" -m '{"image":"base64"}'`

**Performance:** Verification <2s, MQTT <50ms.

**LAN Test Checklist:** IP config, bind 0.0.0.0, firewall open (3001,8000,1883), ESP32 upload.

---

## 🔧 Troubleshooting
### Common Errors
- **DB Connect Fail:** Check MySQL status, .env creds: `mysql -u root -p`.
- **AI Model Not Found:** Download vào ai/models/, check Python deps.
- **MQTT Refused:** `systemctl status mosquitto`, port 1883 open.
- **ESP32 Offline:** WiFi creds, Device ID match, Serial Monitor.
- **Face Inaccurate:** Lower threshold=0.5, more training images, good lighting.
- **Port in Use (Windows):** `netstat -ano | findstr :3001; taskkill /PID <PID> /F`.
- **Frontend Module Not Found:** Run from fe/, `rm -rf .next; npm run dev`.

### LAN Issues
- Ping IP, same WiFi, firewall rules (ufw allow 3001/tcp etc.).
- ESP32: Use LAN IP in config.h.

---

## 🛣️ Roadmap
- **Phase 1 (Done):** Core features (register, verify, remote, logs).
- **Phase 2:** Email/push notifications, mobile app, multi-face.
- **Phase 3:** HTTPS, rate limiting, Redis, CI/CD.