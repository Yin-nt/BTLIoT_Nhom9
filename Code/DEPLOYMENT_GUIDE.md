# 🚀 Hướng Dẫn Triển Khai Smart Cabinet System

## Tổng Quan

Hệ thống Smart Cabinet bao gồm 3 services chính:
- **Backend (backend/)**: Node.js + Express + MySQL + MQTT
- **Frontend (frontend/)**: Next.js + React
- **AI Service (ai/)**: Python + FastAPI + YOLOFace + ArcFace

## 📋 Yêu Cầu Hệ Thống

### Phần Cứng
- **ESP32-CAM**: AI-Thinker hoặc tương đương
- **Servo Motor**: SG90 hoặc MG90S
- **PIR Sensor** (optional): HC-SR501
- **Power Supply**: 5V 2A

### Phần Mềm
- Node.js 18+ và npm/pnpm
- MySQL 8.0+
- Python 3.8+ (với pip)
- Arduino IDE 2.0+
- Git

### Cloud Services
- **MQTT Broker**: Mosquitto (local) hoặc HiveMQ Cloud (production)
- **Hosting** (optional): Vercel (FE), Railway/Render (BE), AWS EC2 (AI)

## 🔧 Cài Đặt Chi Tiết

### 1. Clone Project

\`\`\`bash
git clone <repository-url>
cd smart-cabinet
\`\`\`

### 2. Setup Database

\`\`\`bash
# Start MySQL
sudo systemctl start mysql

# Login to MySQL
mysql -u root -p

# Run schema
mysql -u root -p < scripts/01-create-database.sql

# Seed data (optional)
mysql -u root -p smart_cabinet < scripts/02-seed-data.sql
\`\`\`

### 3. Setup Backend

\`\`\`bash
cd be

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env
nano .env
\`\`\`

**backend/.env:**
\`\`\`env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_cabinet

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this

# AI Service
AI_SERVICE_URL=http://localhost:5000

# MQTT - Mosquitto (Local)
MQTT_BROKER=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# MQTT - HiveMQ Cloud (Production)
# MQTT_BROKER=ssl://your-cluster.hivemq.cloud:8883
# MQTT_USERNAME=your_username
# MQTT_PASSWORD=your_password
\`\`\`

\`\`\`bash
# Start backend
npm run dev

# Backend chạy tại http://localhost:3001
\`\`\`

### 4. Setup AI Service

\`\`\`bash
cd ai

# Create virtual environment
python3 -m venv venv

# Activate venv
source venv/bin/activate  # Linux/Mac
# hoặc
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Download models
mkdir -p models
# Tải models YOLOFace và ArcFace vào thư mục models/
\`\`\`

**Download Models:**
- YOLOFace: `yolov8n-face.onnx` (YOLOv8 face detection)
- ArcFace: `arcface_r100.onnx` (ArcFace recognition)

\`\`\`bash
# Update config.yaml với đường dẫn models
nano config.yaml

# Start AI service
python api/main.py

# AI service chạy tại http://localhost:5000
\`\`\`

### 5. Setup Frontend

\`\`\`bash
cd fe

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local
nano .env.local
\`\`\`

**frontend/.env.local:**
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MQTT_BROKER=ws://localhost:9001
\`\`\`

\`\`\`bash
# Start frontend
npm run dev

# Frontend chạy tại http://localhost:3000
\`\`\`

### 6. Setup MQTT Broker

#### Option 1: Mosquitto (Local)

\`\`\`bash
# Ubuntu/Debian
sudo apt update
sudo apt install mosquitto mosquitto-clients

# macOS
brew install mosquitto

# Start Mosquitto
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Test
mosquitto_sub -h localhost -t "test" &
mosquitto_pub -h localhost -t "test" -m "Hello MQTT"
\`\`\`

**Enable WebSocket (cho frontend):**

Edit `/etc/mosquitto/mosquitto.conf`:
\`\`\`conf
listener 1883
protocol mqtt

listener 9001
protocol websockets
\`\`\`

\`\`\`bash
sudo systemctl restart mosquitto
\`\`\`

#### Option 2: HiveMQ Cloud (Production)

1. Đăng ký tại https://www.hivemq.com/cloud/
2. Tạo cluster miễn phí
3. Lấy credentials và URL
4. Update `.env` trong backend/ và frontend/

### 7. Upload ESP32-CAM Code

\`\`\`bash
cd esp/smart_cabinet_esp32
\`\`\`

**Edit config.h:**
\`\`\`cpp
// WiFi
#define WIFI_SSID "Your_WiFi_SSID"
#define WIFI_PASSWORD "Your_WiFi_Password"

// MQTT
#define MQTT_BROKER "192.168.1.100"  // IP của máy chạy Mosquitto
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""

// Device ID (unique cho mỗi ESP32)
#define DEVICE_ID "ESP32-CAM-001"
\`\`\`

**Arduino IDE Setup:**
1. File → Preferences → Additional Boards Manager URLs:
   \`\`\`
   https://dl.espressif.com/dl/package_esp32_index.json
   \`\`\`
2. Tools → Board → Boards Manager → Install "esp32"
3. Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**
4. Tools → Port → Select COM port
5. Upload code

**Wiring:**
- GPIO12 → Servo Signal
- GPIO13 → PIR Sensor (optional)
- 5V → Servo VCC
- GND → Servo GND

## 🌐 Deployment Production

### Frontend (Vercel)

\`\`\`bash
cd fe

# Login to Vercel
npx vercel login

# Deploy
npx vercel --prod

# Set environment variables
npx vercel env add NEXT_PUBLIC_API_URL
npx vercel env add NEXT_PUBLIC_MQTT_BROKER
\`\`\`

### Backend (Railway/Render)

**Railway:**
\`\`\`bash
cd be

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add MySQL addon
railway add --database mysql

# Deploy
railway up

# Set environment variables
railway variables set JWT_SECRET=your_secret
railway variables set AI_SERVICE_URL=https://your-ai-service.com
\`\`\`

**Render:**
1. Push code lên GitHub
2. Connect repository tới Render
3. Add MySQL database
4. Set environment variables
5. Deploy

### AI Service (AWS EC2)

\`\`\`bash
# Launch EC2 instance (Ubuntu 22.04, t2.medium)
# SSH vào instance
ssh -i key.pem ubuntu@<ec2-ip>

# Update system
sudo apt update
sudo apt upgrade -y

# Install Python
sudo apt install python3-pip python3-venv -y

# Clone repo
git clone <repo-url>
cd smart-cabinet/ai

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Download models
mkdir models
# Upload models vào models/

# Run with systemd
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
ExecStart=/home/ubuntu/smart-cabinet/ai/venv/bin/python api/main.py
Restart=always

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
sudo systemctl daemon-reload
sudo systemctl start ai-service
sudo systemctl enable ai-service

# Check status
sudo systemctl status ai-service
\`\`\`

## 🔐 Security Checklist

- [ ] Đổi JWT_SECRET thành random string
- [ ] Sử dụng HTTPS cho production
- [ ] Enable firewall và chỉ mở ports cần thiết
- [ ] Sử dụng SSL/TLS cho MQTT (port 8883)
- [ ] Backup database định kỳ
- [ ] Enable rate limiting trong backend
- [ ] Sử dụng strong passwords cho MySQL và MQTT
- [ ] Enable CORS chỉ cho domains cần thiết

## 🐛 Troubleshooting

### Backend không kết nối được database
\`\`\`bash
# Check MySQL running
sudo systemctl status mysql

# Test connection
mysql -h localhost -u root -p

# Check credentials trong .env
\`\`\`

### AI Service lỗi model không tìm thấy
\`\`\`bash
# Check models directory
ls -la ai/models/

# Verify paths trong config.yaml
cat ai/config.yaml

# Check Python logs
tail -f ai/logs/app.log
\`\`\`

### ESP32 không kết nối MQTT
\`\`\`bash
# Check MQTT broker running
sudo systemctl status mosquitto

# Test MQTT connection
mosquitto_sub -h localhost -t "#" -v

# Check ESP32 serial logs
# Verify WiFi credentials và MQTT broker IP
\`\`\`

### Frontend không gọi được API
\`\`\`bash
# Check CORS settings trong backend
# Verify NEXT_PUBLIC_API_URL trong .env.local
# Check browser console for errors
\`\`\`

## 📊 Monitoring

\`\`\`bash
# Backend logs
cd be
npm run dev  # hoặc check logs trong production

# AI Service logs
cd ai
tail -f logs/app.log

# MQTT messages
mosquitto_sub -h localhost -t "cabinet/#" -v

# Database connections
mysql -u root -p
SHOW PROCESSLIST;
\`\`\`

## 🎯 Next Steps

1. Deploy tất cả services lên production
2. Setup SSL certificates (Let's Encrypt)
3. Configure load balancing nếu cần
4. Setup monitoring (Prometheus + Grafana)
5. Enable automated backups
6. Setup CI/CD pipeline

Chúc bạn triển khai thành công!
