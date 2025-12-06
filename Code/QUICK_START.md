# 🚀 Quick Start Guide

Hướng dẫn chạy nhanh hệ thống Smart Cabinet trong 5 phút!

## Bước 1: Clone và Install

### Linux/Mac
\`\`\`bash
# Clone repository
git clone <your-repo-url>
cd smart-cabinet

# Install dependencies cho tất cả services
cd be && npm install && cd ..
cd fe && npm install && cd ..
cd ai && pip install -r requirements.txt && cd ..
\`\`\`

### Windows PowerShell
\`\`\`powershell
# Clone repository
git clone <your-repo-url>
cd smart-cabinet

# Install dependencies cho tất cả services
cd be
npm install
cd ..

cd fe
npm install
cd ..

cd ai
py -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
\`\`\`

**Lưu ý Windows:** Nếu gặp lỗi execution policy:
\`\`\`powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
\`\`\`

## Bước 2: Setup Database

### Linux/Mac
\`\`\`bash
# Cài MySQL (nếu chưa có)
# Ubuntu: sudo apt install mysql-server
# Mac: brew install mysql

# Tạo database
mysql -u root -p -e "CREATE DATABASE smart_cabinet;"

# Import schema
mysql -u root -p smart_cabinet < scripts/01-create-database.sql
mysql -u root -p smart_cabinet < scripts/02-seed-data.sql
\`\`\`

### Windows
\`\`\`powershell
# Download MySQL Installer từ https://dev.mysql.com/downloads/installer/
# Hoặc cài XAMPP từ https://www.apachefriends.org/

# Tạo database
mysql -u root -p -e "CREATE DATABASE smart_cabinet;"

# Import schema
Get-Content scripts\01-create-database.sql | mysql -u root -p smart_cabinet
Get-Content scripts\02-seed-data.sql | mysql -u root -p smart_cabinet
\`\`\`

## Bước 3: Config Environment

### Backend (be/.env)
\`\`\`env
## Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_cabinet

## MQTT - Choose one configuration

## Option 1: Mosquitto (Local)
MQTT_BROKER=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

## Option 2: HiveMQ Cloud
# MQTT_BROKER=wss://your-cluster.hivemq.cloud:8884/mqtt
# MQTT_USERNAME=your_username
# MQTT_PASSWORD=your_password

## AI Service
AI_SERVICE_URL=http://localhost:8000

## JWT
JWT_SECRET="1e73a2c59bcfec8d24e139089bab21424af9c6e0a5779bfcdfacd222fa79957f"

## Face Recognition
FACE_SIMILARITY_THRESHOLD=0.6

## Server
PORT=3001
\`\`\`

### Frontend (fe/.env.local)
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:3001
\`\`\`

### AI Service (ai/config.yaml)
\`\`\`yaml
# Giữ nguyên default config
\`\`\`

## Bước 4: Chạy tất cả services

Mở 3 terminals:

### Terminal 1: Backend
\`\`\`bash
cd be
npm run dev
# ✅ Backend running at http://localhost:3001
\`\`\`

### Terminal 2: AI Service

**Linux/Mac:**
\`\`\`bash
cd ai
source venv/bin/activate
python api/main.py
# ✅ AI Service running at http://localhost:8000
\`\`\`

**Windows PowerShell:**
\`\`\`powershell
cd ai
.\venv\Scripts\Activate.ps1
py api/main.py
# ✅ AI Service running at http://localhost:8000
\`\`\`

### Terminal 3: Frontend
\`\`\`bash
cd fe
npm run dev
# ✅ Frontend running at http://localhost:3000
\`\`\`

## Bước 5: Truy cập và Test

1. Mở trình duyệt: **http://localhost:3000**
2. Login với:
   - Username: `admin`
   - Password: `admin123`
3. Vào **Admin → Quản lý Users**
4. Click **Add User** và test chụp ảnh webcam
5. Vào **Dashboard** để xem cabinets

## ✅ Kiểm tra

- [ ] Backend API: `curl http://localhost:3001/api/users`
- [ ] AI Service: `curl http://localhost:8000/health`
- [ ] Frontend: Truy cập http://localhost:3000
- [ ] MySQL: `mysql -u root -p smart_cabinet -e "SHOW TABLES;"`

## 🐛 Nếu có lỗi

### Lỗi 1: Python venv không kích hoạt (Windows)

**Lỗi:**
\`\`\`
source : The term 'source' is not recognized...
\`\`\`

**Giải pháp:**
\`\`\`powershell
# Dùng lệnh này thay vì source
.\venv\Scripts\Activate.ps1

# Nếu vẫn lỗi execution policy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
\`\`\`

### Lỗi 2: Backend - Route.get() requires a callback

**Lỗi:**
\`\`\`
Error: Route.get() requires a callback function but got a [object Object]
\`\`\`

**Giải pháp:** Đã sửa trong `be/src/routes/users.js`. Chạy lại:
\`\`\`bash
cd be
npm run dev
\`\`\`

### Lỗi 3: Frontend - Module not found '../../components'

**Lỗi:**
\`\`\`
Can't resolve '../../components/ui/button'
\`\`\`

**Giải pháp:** Đảm bảo đang chạy từ thư mục `fe/` (không phải `frontend/`)
\`\`\`bash
# Kiểm tra thư mục hiện tại
pwd  # hoặc cd trên Windows

# Phải thấy: .../smart-cabinet/fe
cd fe
npm run dev
\`\`\`

### Backend không start
- Check MySQL đang chạy: `sudo systemctl status mysql` (Linux) hoặc XAMPP (Windows)
- Check credentials trong be/.env
- Check port 3001 không bị chiếm: `netstat -ano | findstr :3001` (Windows)

### AI Service lỗi model not found
- Download models vào `ai/models/` (xem ai/README.md)
- Check Python version: `python --version` (cần 3.8+)

### Frontend không load
- Check NEXT_PUBLIC_API_URL trong fe/.env.local
- Check backend đang chạy ở port 3001
- Clear cache: `rm -rf fe/.next` và chạy lại

### Port already in use (Windows)

**Tìm process đang dùng port:**
\`\`\`powershell
# Backend port 3001
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
\`\`\`

## 🎉 Done!

Bây giờ bạn có thể:
- Thêm users với webcam capture (5-20 ảnh)
- Thêm devices (cabinets)
- Test face verification
- Xem access logs
- Remote control cabinets

## 📖 Đọc thêm

- **README.md** - Hướng dẫn chi tiết đầy đủ
- **WINDOWS_SETUP.md** - Hướng dẫn đặc biệt cho Windows
- **DEPLOYMENT_GUIDE.md** - Deploy lên production

---

**Gặp vấn đề?** Xem phần Troubleshooting trong README.md hoặc WINDOWS_SETUP.md
