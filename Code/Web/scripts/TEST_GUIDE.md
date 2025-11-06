# 🧪 Hướng dẫn Test Hệ Thống BTLIoT Smart Locker

## 📋 Yêu cầu

- Node.js đã cài đặt
- `npm install --legacy-peer-deps` đã chạy
- Next.js dev server đang chạy: `npm run dev`
- MySQL database đã setup (hoặc dùng in-memory)

---

## 🚀 Test 1: API Endpoints

**Mục đích:** Kiểm tra tất cả endpoint backend hoạt động

### Bước 1: Chạy script test API

\`\`\`bash
node scripts/test-api-endpoints.js
\`\`\`

### Kết quả mong đợi:

\`\`\`
1️⃣  Testing REGISTER endpoint...
   Status: 201
   Response: { email: "...", id: 1 }

2️⃣  Testing LOGIN endpoint...
   Status: 200
   Token: ✅ Received

3️⃣  Testing GET DEVICES endpoint...
   Status: 200
   Devices count: 0

4️⃣  Testing GET ALERTS endpoint...
   Status: 200
   Alerts count: 0

5️⃣  Testing FACE STATUS endpoint...
   Status: 200

6️⃣  Testing SEND NOTIFICATION endpoint...
   Status: 200
   Response: { success: true }

7️⃣  Testing GET ACCESS LOGS endpoint...
   Status: 200
   Logs count: 0

✅ All API tests completed!
\`\`\`

### Nếu gặp lỗi:

- **❌ Connection refused**: `npm run dev` chưa chạy
- **❌ 404 Not Found**: Kiểm tra file route có tồn tại không
- **❌ 500 Internal Error**: Xem logs trong terminal dev

---

## 📡 Test 2: MQTT Connection & Publishing

**Mục đích:** Kiểm tra ESP32 có thể gửi dữ liệu qua HiveMQ không

### Bước 1: Chạy script test MQTT

\`\`\`bash
node scripts/test-mqtt-client.js
\`\`\`

### Kết quả mong đợi:

\`\`\`
[MQTT Test] Connecting to HiveMQ broker...
[MQTT Test] ✅ Connected to HiveMQ successfully!
[MQTT Test] ✅ Subscribed to topics: [ 'device/1/unlock', 'device/1/status', 'device/1/alerts' ]

[MQTT Test] Simulating device unlock events...

[MQTT Test] 📤 Published unlock event #1: { ... }
[MQTT Test] 📤 Published unlock event #2: { ... }
[MQTT Test] 📤 Published unlock event #3: { ... }
[MQTT Test] 🚨 Published alert: { ... }
[MQTT Test] 📤 Published unlock event #4: { ... }
[MQTT Test] 📤 Published unlock event #5: { ... }

[MQTT Test] ✅ Test completed! Press Ctrl+C to exit.
\`\`\`

### Ý nghĩa:

- **✅ Connected**: ESP32 có thể kết nối tới HiveMQ
- **📤 Published**: Dữ liệu được gửi tới broker thành công
- **🚨 Alert**: Phát hiện lỗi được ghi nhận

### Nếu gặp lỗi:

- **❌ getaddrinfo ENOTFOUND broker.hivemq.com**: Mất kết nối internet
- **❌ Connection timeout**: HiveMQ broker không phản hồi

---

## 🔔 Test 3: Real-time Alerts (WebSocket/SSE)

**Mục đích:** Kiểm tra Server-Sent Events stream hoạt động real-time

### Bước 1: Mở 2 terminal

**Terminal 1:** Chạy dev server
\`\`\`bash
npm run dev
\`\`\`

**Terminal 2:** Chạy SSE test
\`\`\`bash
node scripts/test-websocket-sse.js
\`\`\`

### Kết quả mong đợi:

\`\`\`
[SSE Test] Connecting to Server-Sent Events stream...
[SSE Test] Connecting to: http://localhost:3000/api/events

[SSE Test] ✅ Connected! Status: 200
[SSE Test] Headers: { 'content-type': 'text/event-stream', ... }
[SSE Test] Listening for events...

(Chờ 30 giây để nhận events...)
\`\`\`

### Kiểm tra xem alert có được gửi:

**Terminal 3:** Gửi notification qua API

\`\`\`bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "title": "Test Alert",
    "message": "Test message",
    "type": "alert"
  }'
\`\`\`

**Kết quả (Terminal 2 sẽ thấy):**

\`\`\`
[SSE Test] 📨 Received event: {
  type: 'unlock_alert',
  device_id: 1,
  message: 'Test message',
  timestamp: '2025-01-15T10:30:45.123Z'
}
\`\`\`

---

## 🔍 Test 4: Check Backend Logs

**Mục đích:** Xem lưu lượng truy cập API realtime

### Bước 1: Thêm debug logs

Mở file `app/api/auth/login/route.ts` và thêm:

\`\`\`typescript
console.log('[smart-locker] Login attempt:', { email });
\`\`\`

### Bước 2: Chạy dev server và observe

\`\`\`bash
npm run dev
\`\`\`

Mỗi khi bạn gọi API, bạn sẽ thấy logs:

\`\`\`
[smart-locker] Login attempt: { email: 'test@example.com' }
[smart-locker] User found in database
[smart-locker] Token generated successfully
\`\`\`

---

## 📊 Test 5: Database Connection

**Mục đích:** Kiểm tra MySQL kết nối và dữ liệu

### Bước 1: Test trực tiếp qua MySQL CLI

\`\`\`bash
mysql -u root -p smart_locker

# Kiểm tra tables
SHOW TABLES;

# Xem data
SELECT * FROM users;
SELECT * FROM devices;
SELECT * FROM access_logs;
\`\`\`

---

## 🧠 Test 6: Face Recognition Pipeline

**Mục đích:** Kiểm tra API nhận diện khuôn mặt

### Bước 1: Upload ảnh khuôn mặt

\`\`\`bash
curl -X POST http://localhost:3000/api/face/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@face.jpg"
\`\`\`

### Bước 2: Nhận diện khuôn mặt

\`\`\`bash
curl -X POST http://localhost:3000/api/face/recognize \
  -H "Content-Type: application/json" \
  -d '{
    "image_base64": "...",
    "device_id": 1
  }'
\`\`\`

### Kết quả mong đợi:

\`\`\`json
{
  "recognized": true,
  "user_id": 1,
  "confidence": 0.95,
  "message": "Face matched successfully"
}
\`\`\`

---

## 📈 Test Flow Hoàn Chỉnh

Chạy các test này theo thứ tự:

\`\`\`
1. npm run dev                    (Start backend)
2. node scripts/test-api-endpoints.js   (Test APIs)
3. node scripts/test-mqtt-client.js     (Test MQTT)
4. node scripts/test-websocket-sse.js   (Test real-time)
5. Check database manually        (Verify data saved)
\`\`\`

---

## 🐛 Troubleshooting

### "npm: command not found"
→ Node.js không được cài hoặc không trong PATH

### "Connection refused"
→ Dev server không chạy: `npm run dev`

### "EACCES: permission denied"
→ Quyền truy cập: `sudo chown -R $USER .`

### "Cannot find module 'mqtt'"
→ Dependencies chưa cài: `npm install --legacy-peer-deps`

---

## ✅ Checklist Hoàn Thành

- [ ] API endpoints tất cả return 200
- [ ] JWT token nhận được khi login
- [ ] MQTT kết nối thành công
- [ ] Alerts được gửi qua SSE
- [ ] Database có dữ liệu
- [ ] Face recognition API đang chạy
- [ ] Không có lỗi trong terminal

---

**Bạn đã test xong chưa? Hãy báo kết quả!**
