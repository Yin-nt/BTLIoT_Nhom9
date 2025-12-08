# Frontend - Smart Cabinet Dashboard

Next.js 16 + React 19 + TypeScript + Tailwind CSS v4

## Features

- Login/Authentication
- Dashboard với real-time cabinet status
- **Webcam capture** để đăng ký người dùng (5-20 ảnh)
- Admin CRUD cho Users và Devices
- Profile management
- Access history
- Remote cabinet control
- PTIT theme (Red + Orange)

## Installation

\`\`\`bash
npm install
\`\`\`

## Environment Variables

Copy `.env.local.example` to `.env.local`:

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:3001
\`\`\`

## Development

\`\`\`bash
npm run dev
# Open http://localhost:3000
\`\`\`

## Build

\`\`\`bash
npm run build
npm start
\`\`\`

## Deploy

\`\`\`bash
vercel
\`\`\`

## Structure

\`\`\`
frontend/
├── app/                    # Next.js 16 App Router
│   ├── admin/             # Admin pages
│   │   ├── users/         # User management với webcam
│   │   └── devices/       # Device management với pairing
│   ├── dashboard/         # Main dashboard
│   ├── history/           # Access logs
│   ├── login/             # Login page
│   ├── profile/           # User profile
│   └── users/             # Users list
├── components/            
│   ├── dashboard-layout.tsx # Sidebar + nav
│   └── ui/                # shadcn components
├── lib/
│   └── api.ts             # API helper với tất cả endpoints
└── package.json
\`\`\`

## API Integration

`lib/api.ts` provides:
- `api.login(credentials)`
- `api.registerUser(formData)` - với 5-20 ảnh
- `api.verifyFace(formData)` - với 1 ảnh
- `api.getUsers()`, `api.updateUser()`, `api.deleteUser()`
- `api.getCabinets()`, `api.createDevice()`, `api.updateDevice()`, `api.deleteDevice()`
- `api.unlockCabinet()`, `api.lockCabinet()`
- `api.getAccessLogs()`

## Webcam Integration

Admin users page includes webcam capture:
- Click "Start Webcam" để mở camera
- Chụp 5-20 ảnh từ nhiều góc độ
- Preview thumbnails
- Submit tất cả ảnh cùng user info

## Device Pairing

Admin devices page có 2 cách thêm thiết bị:
1. **Manual Add**: Nhập device ID, location, MQTT topic
2. **Auto Pairing**: Click "Pair New Device" → Nhấn nút pairing trên ESP32

## Default Login

- Username: `admin`
- Password: `admin123`
