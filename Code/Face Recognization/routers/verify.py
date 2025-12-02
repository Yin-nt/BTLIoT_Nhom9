# routers/verify.py → ĐÃ SỬA: HỖ TRỢ TẤT CẢ TRƯỜNG HỢP + SO SÁNH TẤT CẢ + MQTT
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
import pickle
from datetime import datetime
from utils.crop_face import crop_face_expanded
from utils.mqtt_client import get_mqtt_client

router = APIRouter()

# ============================================
# CẤU HÌNH MQTT - HiveMQ Public Broker
# ============================================
MQTT_BROKER = "test.mosquitto.org"  # HiveMQ public broker
MQTT_PORT = 1883
MQTT_TOPIC = "iot/door/verify/result"  # Topic ESP32 sẽ subscribe
MQTT_USERNAME = None  # Public broker không cần authentication
MQTT_PASSWORD = None

# Khởi tạo MQTT client
mqtt_client = get_mqtt_client(
    broker=MQTT_BROKER,
    port=MQTT_PORT,
    username=MQTT_USERNAME,
    password=MQTT_PASSWORD
)

# Import đúng
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from detector.yolo_face import YOLOFace
from embedder.arcface import ArcFace

detector = YOLOFace()
embedder = ArcFace()
DATA_DIR = "data/users"
DEBUG_IMG_DIR = "data/debug_verify"  # Thêm folder lưu ảnh debug
os.makedirs(DEBUG_IMG_DIR, exist_ok=True)

def load_users():
    users = []
    if not os.path.exists(DATA_DIR):
        return users
    for file in os.listdir(DATA_DIR):
        if file.endswith(".pkl"):
            path = os.path.join(DATA_DIR, file)
            try:
                with open(path, "rb") as f:
                    user = pickle.load(f)
                    users.append(user)
                    print(f"LOADED USER: {user.get('name', 'N/A')} - {user.get('acc', 'N/A')}")
            except Exception as e:
                print(f"LOAD USER ERROR {path}: {e}")
    return users

USERS = load_users()

def cosine_similarity(a, b):
    a = a / (np.linalg.norm(a) + 1e-8)
    b = b / (np.linalg.norm(b) + 1e-8)
    return np.dot(a, b)

def get_user_embeddings(user):
    """Lấy tất cả embedding từ user, bất kể cấu trúc"""
    embs = []
    if "embeddings" in user and isinstance(user["embeddings"], list):
        embs.extend(user["embeddings"])
    if "mean_embedding" in user:
        embs.append(user["mean_embedding"])
    if "embedding" in user:
        embs.append(user["embedding"])
    return [np.array(e) for e in embs if e is not None]

def detect_liveness(face_crop):
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    return laplacian_var > 50  # Người thật

@router.post("/verify")
async def verify_face(file: UploadFile = File(...)):
    print("\n" + "="*50)
    print("🔍 VERIFY REQUEST RECEIVED")
    print(f"📁 Filename: {file.filename}")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)
    
    if not USERS:
        print("❌ ERROR: No users registered")
        raise HTTPException(status_code=400, detail="Chua co nguoi dung! Chay register truoc.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        print("❌ ERROR: Invalid image")
        raise HTTPException(status_code=400, detail="Anh khong hop le!")

    # === LƯU ẢNH GỐC ĐỂ DEBUG ===
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    debug_img_path = os.path.join(DEBUG_IMG_DIR, f"esp32_{timestamp}.jpg")
    cv2.imwrite(debug_img_path, frame)
    print(f"💾 Saved debug image: {debug_img_path}")
    print(f"📐 Image size: {frame.shape[1]}x{frame.shape[0]}")

    faces = detector.detect(frame)
    if not faces:
        print("❌ No face detected in image")
        return {"status": "failed", "message": "Khong phat hien khuon mat"}

    # x1, y1, x2, y2, _ = faces[0]
    x1, y1, x2, y2, conf = int(faces[0][0]), int(faces[0][1]), int(faces[0][2]), int(faces[0][3]), float(faces[0][4])
    print(f"👤 Face detected: bbox=({x1},{y1},{x2},{y2}), confidence={conf:.3f}")
    
    face_crop = frame[y1:y2, x1:x2]
    face_crop, _ = crop_face_expanded(frame, x1, y1, x2, y2)
    
    # === LƯU ẢNH KHUÔN MẶT ĐÃ CROP ĐỂ DEBUG ===
    debug_face_path = os.path.join(DEBUG_IMG_DIR, f"esp32_{timestamp}_face.jpg")
    cv2.imwrite(debug_face_path, face_crop)
    print(f"💾 Saved cropped face: {debug_face_path}")

    # === CHỐNG GIẢ MẠO ===
    if not detect_liveness(face_crop):
        print("⚠️ Liveness check failed (possible spoof)")
        return {"status": "failed", "message": "Gia mao (anh tinh)"}

    # === TRÍCH EMBEDDING ===
    try:
        emb = embedder.get(face_crop)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding error: {e}")

    # === SO SÁNH VỚI TẤT CẢ USER + TẤT CẢ EMBEDDING ===
    best_score = -1
    best_user = None

    for user in USERS:
        user_embs = get_user_embeddings(user)
        if not user_embs:
            continue
        sims = [cosine_similarity(emb, ue) for ue in user_embs]
        max_sim = max(sims)
        if max_sim > best_score:
            best_score = max_sim
            best_user = user

    # === KẾT QUẢ ===
    if best_user and best_score > 0.55:
        print(f"✅ VERIFIED: {best_user.get('name')} ({best_user.get('acc')}) - Score: {best_score:.3f}")
        
        # Tạo response
        response_data = {
            "status": "success",
            "name": best_user.get("name", "Unknown"),
            "acc": best_user.get("acc", "unknown"),
            "score": round(float(best_score), 3),
            "liveness": "live",
            "matched_from": "all_embeddings",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Publish lên MQTT
        mqtt_client.publish(MQTT_TOPIC, response_data, qos=1)
        
        return response_data
    else:
        print(f"❌ FAILED: Unknown person - Best score: {best_score:.3f}")
        
        # Tạo response
        response_data = {
            "status": "failed",
            "message": "Khong nhan dien duoc",
            "best_score": round(float(best_score), 3) if best_score > -1 else None,
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Publish lên MQTT
        mqtt_client.publish(MQTT_TOPIC, response_data, qos=1)
        
        return response_data