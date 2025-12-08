# 🔐 Smart Cabinet System - Hệ Thống Tủ Thông Minh Mở bằng camera ESP32-CAM

## Giới thiệu
Dự án IoT sử dụng ESP32-CAM để nhận diện khuôn mặt và mở tủ tự động.  
Hệ thống giúp tăng tính bảo mật và tiện lợi cho người dùng.

## Chức năng chính
- Nhận diện khuôn mặt để mở tủ.
- Cảnh báo khi phát hiện người lạ.
- Điều khiển và giám sát từ xa qua web/app.

- Hệ thống tủ thông minh sử dụng AI nhận diện khuôn mặt với ESP32-CAM, tách thành 3 services độc lập: Backend (Node.js), AI Service (Python), và Frontend (Next.js).

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Database Schema](#database-schema)
- [Cài Đặt](#cài-đặt)
- [Cấu Hình](#cấu-hình)
- [Chạy Dự Án](#chạy-dự-án)
- [MQTT Broker](#mqtt-broker)
- [Tích Hợp AI](#tích-hợp-ai)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Demo](#demo)

## 🎯 Tổng Quan

Hệ thống tủ thông minh cho phép:
- ✅ Mở khóa bằng nhận diện khuôn mặt (AI-powered với YOLOFace + ArcFace)
- ✅ Đăng ký với 5-20 ảnh, xác thực chỉ cần 1 ảnh
- ✅ Điều khiển từ xa qua Web Dashboard
- ✅ Giám sát real-time qua MQTT (Mosquitto hoặc HiveMQ)
- ✅ Cảnh báo an ninh tự động
- ✅ Quản lý người dùng và quyền truy cập
- ✅ Lưu trữ lịch sử truy cập chi tiết

## 🏗️ Kiến Trúc Hệ Thống

\`\`\`
┌─────────────────┐     MQTT      ┌──────────────────┐
│  ESP32-CAM      │ ◄────────────► │  MQTT Broker     │
│  (Device)       │                │  (Mosquitto/     │
│  - Camera       │                │   HiveMQ Cloud)  │
│  - Relay Lock   │                └──────────────────┘
└─────────────────┘                         ▲
       │                                    │
       │ Send image (base64)                │ Pub/Sub
       ▼                                    │
┌─────────────────┐                         │
│  Backend (be/)  │ ◄───────────────────────┘
│  Node.js +      │
│  Express        │        HTTP POST
│  - MQTT Client  │ ────────────────► ┌─────────────────┐
│  - Database     │                   │  AI Service     │
│  - Auth (JWT)   │ ◄──────────────── │  (ai/)          │
│  - API Routes   │     Embeddings    │  - YOLOFace     │
└─────────────────┘                   │  - ArcFace      │
       │                              │  Flask/FastAPI  │
       │ MySQL                        └─────────────────┘
       ▼
┌─────────────────┐
│  MySQL Database │
│  - users        │
│  - face_images  │        HTTP/WS    ┌─────────────────┐
│  - embeddings   │ ◄────────────────►│  Frontend (fe/) │
│  - cabinets     │                   │  Next.js        │
│  - access_logs  │                   │  - Dashboard    │
└─────────────────┘                   │  - User Mgmt    │
                                      └─────────────────┘
\`\`\`

## 📁 Cấu Trúc Dự Án

\`\`\`
smart-cabinet/
│
├── be/                          # Backend Service (Node.js)
│   ├── src/
│   │   ├── index.js            # Express server entry point
│   │   ├── config/
│   │   │   └── database.js     # MySQL connection pool
│   │   ├── services/
│   │   │   ├── mqtt.js         # MQTT client & handlers
│   │   │   └── face.js         # Face recognition logic
│   │   ├── routes/
│   │   │   ├── auth.js         # Login/register routes
│   │   │   ├── cabinets.js     # Cabinet control routes
│   │   │   └── face.js         # Face verify routes
│   │   └── middleware/
│   │       └── auth.js         # JWT authentication
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   └── seed.sql            # Sample data
│   ├── .env.example
│   └── package.json
│
├── fe/                          # Frontend Service (Next.js)
│   ├── app/
│   │   ├── page.tsx            # Login page
│   │   ├── dashboard/          # Dashboard pages
│   │   ├── api/                # (Optional) Next.js API routes
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   ├── .env.local.example
│   └── package.json
│
├── ai/                          # AI Service (Python)
│   ├── app.py                  # Flask/FastAPI server
│   ├── models/
│   │   ├── yolov5n-face.pt     # YOLOFace model (download)
│   │   └── arcface.onnx        # ArcFace model (download)
│   ├── config.yaml
│   ├── requirements.txt
│   └── README.md
│
├── esp/                         # ESP32-CAM Firmware
│   └── smart_cabinet_esp32/
│       ├── smart_cabinet_esp32.ino
│       └── config.h
│
└── README.md                    # This file
\`\`\`

## 🛠️ Công Nghệ Sử Dụng

### Hardware
- **ESP32-CAM**: Camera module với WiFi
- **Relay Module**: Điều khiển khóa điện
- **PIR Sensor (Optional)**: Phát hiện chuyển động

### Backend (be/)
- **Node.js 18+** với Express
- **MySQL2**: Database driver với connection pool
- **MQTT.js**: MQTT client cho Mosquitto/HiveMQ
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication
- **axios**: HTTP client để gọi AI service

### Frontend (fe/)
- **Next.js 16**: React framework với App Router
- **React 19**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS v4**: Styling
- **SWR**: Client-side data fetching
- **MQTT.js**: WebSocket MQTT client

### AI Service (ai/)
- **Python 3.8+**
- **Flask/FastAPI**: Web framework
- **OpenCV**: Image processing
- **ONNX Runtime**: Model inference
- **YOLOFace**: Face detection
- **ArcFace**: Face embedding extraction (512-dim vector)

### MQTT Broker
- **Mosquitto** (local development)
- **HiveMQ Cloud** (production)

## 🗄️ Database Schema

### Thiết kế tối ưu cho đăng ký (5-20 ảnh) và xác thực (1 ảnh)

\`\`\`sql
-- Bảng users: Thông tin người dùng
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng user_face_images: Lưu 5-20 ảnh khi đăng ký
-- (Tách riêng để dễ quản lý multiple images per user)
CREATE TABLE user_face_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng face_embeddings: Lưu embedding của MỖI ảnh
-- (512-dimensional vector từ ArcFace)
CREATE TABLE face_embeddings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  image_id INT NOT NULL,
  embedding JSON NOT NULL COMMENT '512-dimensional vector',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_id) REFERENCES user_face_images(id) ON DELETE CASCADE
);

-- Bảng cabinets: Thông tin tủ
CREATE TABLE cabinets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cabinet_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  location VARCHAR(300),
  status ENUM('online', 'offline') DEFAULT 'offline',
  lock_status ENUM('locked', 'unlocked') DEFAULT 'locked',
  last_seen TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng access_logs: Lịch sử truy cập
CREATE TABLE access_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cabinet_id INT NOT NULL,
  user_id INT NULL COMMENT 'NULL if face not recognized',
  access_type ENUM('face', 'remote', 'manual') NOT NULL,
  success BOOLEAN NOT NULL,
  image_url VARCHAR(500) NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
\`\`\`

### Luồng dữ liệu:

**Đăng ký (Registration):**
\`\`\`
Upload 5-20 ảnh → Lưu vào user_face_images
                → Gọi AI Service extract embedding cho MỖI ảnh
                → Lưu 5-20 embeddings vào face_embeddings
\`\`\`

**Xác thực (Verification):**
\`\`\`
Upload 1 ảnh → AI Service extract embedding
            → So sánh với TẤT CẢ embeddings trong face_embeddings
            → Tìm best match (cosine similarity)
            → Nếu similarity >= threshold (0.6) → Granted
\`\`\`

**Lợi ích:**
- Tách bảng giúp quản lý nhiều ảnh dễ dàng
- Mỗi ảnh có embedding riêng → tăng độ chính xác
- Verify nhanh: chỉ cần 1 ảnh, không cần upload lại nhiều ảnh

## 📦 Cài Đặt

### Prerequisites

- Node.js 18+ và npm/yarn
- Python 3.10+
- MySQL 8.0+
- Arduino IDE (cho ESP32)

### Windows Users

**Xem hướng dẫn chi tiết tại:** [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)

**Lưu ý quan trọng cho Windows:**
- Dùng PowerShell (không phải CMD)
- Kích hoạt venv: `.\venv\Scripts\Activate.ps1` (không phải `source`)
- Nếu gặp lỗi execution policy: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd smart-cabinet
\`\`\`

### 2. Setup Backend (be/)

\`\`\`bash
cd be

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env với thông tin của bạn
nano .env

# Setup database
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
\`\`\`

### 3. Setup Frontend (fe/)

\`\`\`bash
cd fe

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local
nano .env.local
\`\`\`

### 4. Setup AI Service (ai/)

\`\`\`bash
cd ai

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Download models (cần tải thủ công)
# YOLOFace: https://github.com/derronqi/yolov8-face
# ArcFace: https://github.com/onnx/models/tree/main/vision/body_analysis/arcface
mkdir models
# Place models in models/ directory
\`\`\`

### 5. Setup ESP32-CAM (esp/)

\`\`\`bash
# Mở Arduino IDE
# Install ESP32 board support:
# File → Preferences → Additional Boards Manager URLs:
# https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

# Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM

# Cài đặt libraries:
# - PubSubClient (MQTT)
# - ArduinoJson

# Mở esp/smart_cabinet_esp32/smart_cabinet_esp32.ino
# Sửa config.h với WiFi và MQTT credentials
# Upload code
\`\`\`

## ⚙️ Cấu Hình

### Backend (.env)

\`\`\`env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_cabinet

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# MQTT - Option 1: Mosquitto (Local)
MQTT_BROKER=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# MQTT - Option 2: HiveMQ Cloud
# MQTT_BROKER=wss://your-cluster.hivemq.cloud:8884/mqtt
# MQTT_USERNAME=your_username
# MQTT_PASSWORD=your_password

# AI Service
AI_SERVICE_URL=http://localhost:5000

# Face Recognition
FACE_SIMILARITY_THRESHOLD=0.6

# Server
PORT=3001
\`\`\`

### Frontend (.env.local)

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MQTT_WS_URL=ws://localhost:9001
\`\`\`

### AI Service (config.yaml)

\`\`\`yaml
models:
  yoloface: "models/yolov5n-face.pt"
  arcface: "models/arcface.onnx"

server:
  host: "0.0.0.0"
  port: 5000

face_detection:
  confidence_threshold: 0.5

face_recognition:
  similarity_threshold: 0.6
\`\`\`

### ESP32-CAM (config.h)

\`\`\`cpp
// WiFi
#define WIFI_SSID "your_wifi_name"
#define WIFI_PASSWORD "your_wifi_password"

// MQTT - Option 1: Mosquitto
#define MQTT_BROKER "192.168.1.100"  // Backend server IP
#define MQTT_PORT 1883
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""

// MQTT - Option 2: HiveMQ Cloud
// #define MQTT_BROKER "your-cluster.hivemq.cloud"
// #define MQTT_PORT 8883
// #define MQTT_USERNAME "your_username"
// #define MQTT_PASSWORD ""

// Cabinet ID
#define CABINET_ID "CAB001"
\`\`\`

## 🚀 Chạy Dự Án

### Bước 1: Khởi động MySQL

\`\`\`bash
# Ubuntu/Debian
sudo systemctl start mysql
sudo systemctl status mysql

# macOS
brew services start mysql

# Windows (XAMPP)
# Start MySQL từ XAMPP Control Panel
\`\`\`

### Bước 2: Khởi động MQTT Broker

#### Option A: Mosquitto (Local Development)

**Cài đặt:**

\`\`\`bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients

# macOS
brew install mosquitto

# Windows
# Download từ https://mosquitto.org/download/
\`\`\`

**Cấu hình `/etc/mosquitto/mosquitto.conf`:**

\`\`\`conf
listener 1883
allow_anonymous true

# WebSocket support for frontend
listener 9001
protocol websockets

# Logging
log_dest file /var/log/mosquitto/mosquitto.log
log_type all

# Persistence
persistence true
persistence_location /var/lib/mosquitto/
\`\`\`

**Khởi động:**

\`\`\`bash
# Start as service
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Hoặc chạy thủ công với verbose output
mosquitto -c /etc/mosquitto/mosquitto.conf -v
\`\`\`

**Test kết nối:**

\`\`\`bash
# Terminal 1: Subscribe
mosquitto_sub -h localhost -t "cabinet/#" -v

# Terminal 2: Publish test message
mosquitto_pub -h localhost -t "cabinet/test" -m "Hello MQTT"
\`\`\`

#### Option B: HiveMQ Cloud (Production Ready)

**Setup:**

1. Đăng ký tại [console.hivemq.cloud](https://console.hivemq.cloud)
2. Tạo cluster mới (Free tier có sẵn)
3. Tạo credentials (username/password)
4. Lấy connection details:
   - Host: `your-cluster.hivemq.cloud`
   - Port: `8883` (TLS) hoặc `1883`
   - Protocol: `MQTT over TLS` hoặc `WebSocket Secure`

5. Test kết nối:

\`\`\`bash
# Using mosquitto_sub
mosquitto_sub -h your-cluster.hivemq.cloud -p 8883 \
  -t "cabinet/#" \
  -u your_username -P your_password \
  --capath /etc/ssl/certs/ -v

# Using MQTT.js CLI
npx mqtt sub -h mqtts://your-cluster.hivemq.cloud:8883 \
  -t "cabinet/#" \
  -u your_username -P your_password
\`\`\`

### Bước 3: Khởi động AI Service

\`\`\`bash
cd ai

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Run Flask server
python app.py

# Server chạy tại http://localhost:5000
\`\`\`

**Test AI Service:**

\`\`\`bash
# Health check
curl http://localhost:5000/health

# Test face detection
curl -X POST http://localhost:5000/detect \
  -F "image=@test_face.jpg"

# Test embedding extraction
curl -X POST http://localhost:5000/extract \
  -F "image=@test_face.jpg"
\`\`\`

### Bước 4: Khởi động Backend

\`\`\`bash
cd be

# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Server chạy tại http://localhost:3001
\`\`\`

**Test Backend:**

\`\`\`bash
# Health check
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartcabinet.com","password":"admin123"}'
\`\`\`

### Bước 5: Khởi động Frontend

\`\`\`bash
cd fe

# Development mode
npm run dev

# Build and start production
npm run build
npm start

# Truy cập http://localhost:3000
\`\`\`

### Bước 6: Upload ESP32-CAM Code

1. Mở Arduino IDE
2. Mở `esp/smart_cabinet_esp32/smart_cabinet_esp32.ino`
3. Sửa `config.h` với WiFi và MQTT credentials
4. Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**
5. Tools → Port → Chọn COM port
6. Upload code
7. Mở Serial Monitor (115200 baud) để xem logs

## 🤖 Tích Hợp AI và Backend

### Architecture Flow

\`\`\`
ESP32-CAM capture image
       ↓
    base64 encode
       ↓
MQTT publish to backend
       ↓
Backend receives via MQTT
       ↓
HTTP POST to AI Service (Flask)
       ↓
AI: YOLOFace detect face → ArcFace extract embedding
       ↓
Backend: Compare embedding with database
       ↓
If match: MQTT publish unlock command
       ↓
ESP32-CAM receives command → unlock relay
\`\`\`

### Backend ↔ AI Integration (be/src/services/face.js)

\`\`\`javascript
// Extract embedding from image using AI service
async extractEmbedding(imageBuffer) {
  try {
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]));

    const response = await axios.post(
      `${this.aiServiceUrl}/extract`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    return response.data.embedding; // 512-dim vector
  } catch (error) {
    console.error('AI service error:', error.message);
    throw new Error('AI service unavailable');
  }
}

// Verify face (1 image) against all user embeddings
async verifyFace(imageBuffer, userId = null) {
  // 1. Extract embedding from input image
  const inputEmbedding = await this.extractEmbedding(imageBuffer);

  // 2. Get all embeddings from database
  const [rows] = await db.execute(`
    SELECT 
      fe.embedding,
      ufi.user_id,
      u.username,
      u.email
    FROM face_embeddings fe
    JOIN user_face_images ufi ON fe.image_id = ufi.id
    JOIN users u ON ufi.user_id = u.id
    ${userId ? 'WHERE ufi.user_id = ?' : ''}
  `, userId ? [userId] : []);

  // 3. Compare with all embeddings using cosine similarity
  let bestMatch = { similarity: 0, user: null };

  for (const row of rows) {
    const storedEmbedding = JSON.parse(row.embedding);
    const similarity = this.cosineSimilarity(inputEmbedding, storedEmbedding);

    if (similarity > bestMatch.similarity) {
      bestMatch = { similarity, user: row };
    }
  }

  // 4. Check threshold
  const threshold = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '0.6');

  if (bestMatch.similarity >= threshold) {
    return {
      success: true,
      user_id: bestMatch.user.user_id,
      username: bestMatch.user.username,
      similarity: bestMatch.similarity
    };
  } else {
    return {
      success: false,
      message: 'Face not recognized',
      best_similarity: bestMatch.similarity
    };
  }
}

// Cosine similarity calculation
cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magA * magB);
}
\`\`\`

### MQTT Integration (be/src/services/mqtt.js)

\`\`\`javascript
async handleVerifyRequest(topic, data) {
  // ESP32 sends: { image: "base64...", cabinet_id: "CAB001" }
  const cabinetId = topic.split('/')[1];
  
  try {
    // Decode base64 to buffer
    const imageBuffer = Buffer.from(data.image, 'base64');

    // Call face service
    const result = await faceService.verifyFace(imageBuffer);

    // Log to database
    await db.execute(`
      INSERT INTO access_logs 
      (cabinet_id, user_id, access_type, success, timestamp) 
      VALUES (
        (SELECT id FROM cabinets WHERE cabinet_id = ?),
        ?,
        'face',
        ?,
        NOW()
      )
    `, [cabinetId, result.user_id || null, result.success]);

    // Send result back to ESP32
    this.publish(`cabinet/${cabinetId}/verify/result`, {
      success: result.success,
      user_id: result.user_id,
      username: result.username,
      action: result.success ? 'unlock' : 'deny'
    });

  } catch (error) {
    console.error('Verify error:', error);
    this.publish(`cabinet/${cabinetId}/verify/result`, {
      success: false,
      error: error.message
    });
  }
}
\`\`\`

## 📚 API Documentation

### Authentication

#### POST `/api/auth/login`

**Request:**
\`\`\`json
{
  "email": "admin@smartcabinet.com",
  "password": "admin123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "Admin",
    "email": "admin@smartcabinet.com",
    "role": "admin"
  }
}
\`\`\`

#### POST `/api/auth/register`

**Request:**
\`\`\`json
{
  "username": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "User registered successfully",
  "user_id": 2
}
\`\`\`

### Face Recognition

#### POST `/api/face/verify`

**Request (multipart/form-data):**
- `image`: File (JPEG/PNG, 1 ảnh duy nhất)
- `cabinet_id`: string (optional)

**Response (Success):**
\`\`\`json
{
  "success": true,
  "user_id": 2,
  "username": "John Doe",
  "similarity": 0.87
}
\`\`\`

**Response (Failure):**
\`\`\`json
{
  "success": false,
  "message": "Face not recognized",
  "best_similarity": 0.42
}
\`\`\`

### User Management

#### POST `/api/users/register-with-faces`

Đăng ký người dùng với 5-20 ảnh khuôn mặt

**Request (multipart/form-data):**
- `username`: string
- `email`: string
- `password`: string
- `images[]`: File[] (5-20 ảnh)

**Response:**
\`\`\`json
{
  "success": true,
  "user_id": 3,
  "images_processed": 10,
  "embeddings_created": 10
}
\`\`\`

### Cabinet Control

#### GET `/api/cabinets`

Lấy danh sách tủ

**Headers:**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "cabinet_id": "CAB001",
    "name": "Main Entrance Cabinet",
    "location": "Building A - Floor 1",
    "status": "online",
    "lock_status": "locked",
    "last_seen": "2025-01-15T10:30:00Z"
  }
]
\`\`\`

#### POST `/api/cabinets/control`

Điều khiển tủ từ xa

**Headers:**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**Request:**
\`\`\`json
{
  "cabinet_id": "CAB001",
  "action": "unlock"  // hoặc "lock"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Cabinet unlocked successfully"
}
\`\`\`

#### GET `/api/cabinets/:cabinet_id/logs`

Lấy lịch sử truy cập

**Headers:**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**Query params:**
- `limit`: number (default: 50)

**Response:**
\`\`\`json
[
  {
    "id": 123,
    "cabinet_name": "Main Entrance Cabinet",
    "username": "John Doe",
    "access_type": "face",
    "success": true,
    "timestamp": "2025-01-15T10:25:33Z"
  }
]
\`\`\`

## 🚢 Deployment

### Deploy Backend (be/)

**Option 1: Railway**

\`\`\`bash
cd be

# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project
railway init

# Add MySQL database
railway add

# Deploy
railway up
\`\`\`

**Option 2: Heroku**

\`\`\`bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

heroku create smart-cabinet-backend
heroku addons:create cleardb:ignite
heroku config:set JWT_SECRET=your_secret
git push heroku main
\`\`\`

### Deploy Frontend (fe/)

**Vercel (Recommended):**

\`\`\`bash
cd fe

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production
vercel --prod
\`\`\`

### Deploy AI Service (ai/)

**Option 1: AWS EC2**

\`\`\`bash
# Launch EC2 instance (t2.medium hoặc lớn hơn)
# Ubuntu 22.04 LTS

# SSH vào instance
ssh -i key.pem ubuntu@<ec2-ip>

# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv

# Clone và setup
git clone <repo>
cd ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download models
mkdir models
# Copy models vào models/

# Run với systemd
sudo nano /etc/systemd/system/ai-service.service
\`\`\`

**/etc/systemd/system/ai-service.service:**

\`\`\`ini
[Unit]
Description=Smart Cabinet AI Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/smart-cabinet/ai
Environment="PATH=/home/ubuntu/smart-cabinet/ai/venv/bin"
ExecStart=/home/ubuntu/smart-cabinet/ai/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl start ai-service
sudo systemctl enable ai-service
\`\`\`

**Option 2: Docker**

\`\`\`dockerfile
# ai/Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
\`\`\`

\`\`\`bash
# Build
docker build -t smart-cabinet-ai ./ai

# Run
docker run -d -p 5000:5000 \
  -v $(pwd)/ai/models:/app/models \
  smart-cabinet-ai
\`\`\`

### Deploy MQTT (HiveMQ Cloud)

HiveMQ Cloud đã sẵn sàng, không cần deploy thêm. Chỉ cần:

1. Sử dụng credentials từ HiveMQ console
2. Update environment variables trong BE và FE
3. Update config.h trong ESP32

## 🎬 Demo & Testing

### Test Full Flow

**1. Đăng ký người dùng với nhiều ảnh:**

\`\`\`bash
# Chuẩn bị 10 ảnh của 1 người: face1.jpg, face2.jpg, ..., face10.jpg

# Register via API
curl -X POST http://localhost:3001/api/users/register-with-faces \
  -F "username=Test User" \
  -F "email=test@example.com" \
  -F "password=Test123" \
  -F "images[]=@face1.jpg" \
  -F "images[]=@face2.jpg" \
  -F "images[]=@face3.jpg" \
  -F "images[]=@face4.jpg" \
  -F "images[]=@face5.jpg" \
  -F "images[]=@face6.jpg" \
  -F "images[]=@face7.jpg" \
  -F "images[]=@face8.jpg" \
  -F "images[]=@face9.jpg" \
  -F "images[]=@face10.jpg"
\`\`\`

**2. Test xác thực với 1 ảnh:**

\`\`\`bash
curl -X POST http://localhost:3001/api/face/verify \
  -F "image=@test_face.jpg"
\`\`\`

**3. Test MQTT flow:**

\`\`\`bash
# Terminal 1: Subscribe to all topics
mosquitto_sub -h localhost -t "cabinet/#" -v

# Terminal 2: Publish verify request (giống ESP32)
mosquitto_pub -h localhost -t "cabinet/CAB001/verify" \
  -m '{"image":"<base64_image>","timestamp":1234567890}'

# Xem kết quả trong terminal 1
\`\`\`

**4. Test remote control:**

\`\`\`bash
# Login first
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartcabinet.com","password":"admin123"}' \
  | jq -r '.token')

# Unlock cabinet
curl -X POST http://localhost:3001/api/cabinets/control \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cabinet_id":"CAB001","action":"unlock"}'
\`\`\`

### Demo Scenario

**Scenario: Nhân viên truy cập tủ công ty**

1. **Đăng ký:**
   - HR upload 10 ảnh của nhân viên mới vào hệ thống
   - AI service tạo 10 embeddings và lưu vào database
   
2. **Sáng đến công ty:**
   - Nhân viên đứng trước tủ
   - PIR sensor phát hiện chuyển động (optional)
   - ESP32-CAM tự động chụp ảnh
   - Gửi ảnh (base64) qua MQTT
   
3. **Backend xử lý:**
   - Nhận ảnh từ MQTT
   - Gọi AI service extract embedding
   - So sánh với 10 embeddings trong DB
   - Tìm best match với similarity 0.87 (> threshold 0.6)
   - Xác nhận: Đúng người
   
4. **Mở khóa:**
   - Backend publish command "unlock" qua MQTT
   - ESP32 nhận command
   - Kích hoạt relay → mở khóa
   - LED sáng xanh 5 giây
   - Tự động khóa lại
   
5. **Logging:**
   - Lưu vào access_logs: user_id, timestamp, success=true
   - Frontend dashboard hiển thị real-time
   - Admin có thể xem lịch sử

### Test từng component riêng

\`\`\`bash
# Test MySQL
mysql -u root -p -e "USE smart_cabinet; SELECT COUNT(*) FROM users;"

# Test MQTT
mosquitto_pub -h localhost -t "test" -m "hello"

# Test AI Service
curl http://localhost:5000/health

# Test Backend
curl http://localhost:3001/health

# Test Frontend
curl http://localhost:3000
\`\`\`

## 🔧 Troubleshooting

### Backend không kết nối MySQL

\`\`\`bash
# Check MySQL running
sudo systemctl status mysql

# Check credentials in .env
cat be/.env | grep DB_

# Test connection
mysql -h localhost -u root -p
\`\`\`

### MQTT không connect

\`\`\`bash
# Check Mosquitto running
sudo systemctl status mosquitto

# Check port
netstat -tuln | grep 1883

# Test with mosquitto_sub
mosquitto_sub -h localhost -t "test" -v
\`\`\`

### AI Service lỗi model

\`\`\`bash
# Check models exist
ls -lh ai/models/

# Check Python dependencies
pip list | grep -E "opencv|onnx|torch"

# Run with debug
python ai/app.py
\`\`\`

### ESP32-CAM không kết nối WiFi

\`\`\`cpp
// Check WiFi credentials in config.h
// Try connect to WiFi manually first
// Check router MAC filtering
// Use 2.4GHz WiFi (ESP32 không hỗ trợ 5GHz)
\`\`\`

### Face recognition không chính xác

\`\`\`bash
# Giảm threshold trong be/.env
FACE_SIMILARITY_THRESHOLD=0.5  # Thay vì 0.6

# Upload thêm ảnh training (5-20 ảnh từ nhiều góc độ)
# Check AI service logs
tail -f ai/logs/app.log

# Check lighting conditions (ảnh tốt = recognition tốt)
\`\`\`

## 📝 Notes

- **Database**: Tách bảng `user_face_images` và `face_embeddings` giúp quản lý nhiều ảnh dễ dàng hơn so với lưu trong 1 bảng
- **MQTT**: HiveMQ Cloud miễn phí giới hạn 100 clients, đủ cho demo. Production nên upgrade.
- **AI**: YOLOFace + ArcFace cho độ chính xác cao. Có thể thay bằng FaceNet hoặc DeepFace.
- **Security**: JWT token expire sau 24h. Trong production nên dùng refresh token.
- **ESP32**: Cần nguồn 5V/2A ổn định. Nguồn yếu sẽ khiến camera restart.

## 👥 Contributors

- Trần Mai Hương (B22DCCN424)
- Nguyễn Thị Khánh Vân (B22DCCN892)
- Nguyễn Nam Vũ (B22DCCN916)
- Nguyễn Thị Yến (B22DCCN928)

## 📄 License

MIT License

---

**Built with ❤️ by Team 9 - IoT & Applications Course 2025**
