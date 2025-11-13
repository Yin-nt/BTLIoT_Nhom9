# Face Recognition System – High Accuracy & Robustness

Hệ thống nhận diện khuôn mặt **API + Camera Test**.

> **Dùng ArcFace + YOLOv8 + FastAPI + OpenCV**  

---

## Cấu trúc thư mục
```
Face Recognization/
├── api/                    # FastAPI server
│   ├── main.py             # Entry point API
│   └── routers/
│       ├── register.py     # POST /api/register (5-20 ảnh)
│       └── verify.py       # POST /api/verify (1 ảnh)
|
├── data/                   # Dữ liệu người dùng
│   ├── users/              # *.pkl (name, acc, embeddings, mean_embedding)
│   ├── test/               # Lưu ảnh để test
│   └── images/             # Ảnh crop rộng (theo acc)
│
├── detector/               # Face detection
│   └── yolo_face.py        # YOLOv8 + trả tọa độ khuôn mặt
│
├── embedder/               # Face embedding
│   └── arcface.py          # ArcFace ONNX – 512-dim embedding
│
├── models/                 # Model files
│   ├── yolov8n-face-lindevs.pt
│   └── w600k_r50.onnx      # Model arcarcfaceface
|
├── output/                 # Kết quả verify
│   └── verify/             # Ảnh lưu khi nhấn 's'
│
├── routers           
│   ├── register.bat        # API đăng ký
│   ├── verify.bat          # API xác thực
|
├── services/               # Test bằng camera
│   ├── register.py         # Đăng ký từ webcam 
│   └── verify.py           # Nhận diện realtime + lưu ảnh
|
├── utils/                  # Công cụ hỗ trợ
│   └── crop_face.py        # Crop mở rộng 30% (toàn đầu + cổ)
│
├── requirements.txt        # Thư viện cần cài
└── README.md               
```

---

## Yêu cầu hệ thống

- **OS**: Windows 10/11
- **Python**: 3.9+
- **Camera**: Webcam (cho `services/`)
- **GPU**: Khuyến nghị (CPU vẫn chạy được)

---

## Cài đặt

Tải w600k_r50.onnx về folder models từ https://github.com/yakhyo/face-reidentification/releases/tag/v0.0.1

```powershell
# 1. Vào thư mục dự án
cd H:\DOCUMENT\IoT\Tu2

# 2. Tạo môi trường ảo
python -m venv venv
venv\Scripts\activate

# 3. Cài thư viện
pip install -r requirements.txt
```

## Hướng dẫn sử dụng
- **1. Chạy API Server (Swagger UI)**
```powershell
python -m api.main
```
Truy cập: http://localhost:8000/docs

- **2. Đăng ký từ Camera**
```powershell
python services/register.py
```

- **3. Nhận diện Realtime từ Camera**
```powershell
python services/verify.py
```