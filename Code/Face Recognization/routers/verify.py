from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
import pickle
from datetime import datetime
from utils.crop_face import crop_face_expanded

# ====== SETUP ======
router = APIRouter()
DATA_DIR = "data/users"
OUTPUT_DIR = "output/verify"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ====== IMPORT MODULE ======
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from detector.yolo_face import YOLOFace
from embedder.arcface import ArcFace

detector = YOLOFace()
embedder = ArcFace()

# ====== UTILS ======
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
    """Lấy tất cả embedding từ user, bất kể cấu trúc."""
    embs = []
    if "embeddings" in user and isinstance(user["embeddings"], list):
        embs.extend(user["embeddings"])
    if "mean_embedding" in user:
        embs.append(user["mean_embedding"])
    if "embedding" in user:
        embs.append(user["embedding"])
    return [np.array(e) for e in embs if e is not None]

def detect_liveness(face_crop):
    """Kiểm tra giả mạo qua độ tương phản (Laplacian variance)."""
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    return laplacian_var > 50  # người thật

def safe_putText(frame, text, pos, color=(0,255,0), scale=0.8, thick=2):
    """Vẽ chữ an toàn, không tràn khung."""
    font = cv2.FONT_HERSHEY_SIMPLEX
    (w, h), _ = cv2.getTextSize(text, font, scale, thick)
    x, y = pos
    h_frame, w_frame = frame.shape[:2]
    x = max(0, min(x, w_frame - w))
    y = max(h, min(y, h_frame))
    cv2.putText(frame, text, (x, y), font, scale, color, thick)

# ====== API VERIFY ======
@router.post("/verify")
async def verify_face(file: UploadFile = File(...)):
    if not USERS:
        raise HTTPException(status_code=400, detail="Chưa có người dùng! Hãy chạy đăng ký trước.")

    # Đọc ảnh upload
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Ảnh không hợp lệ!")

    faces = detector.detect(frame)
    if not faces:
        return {"status": "failed", "message": "Không phát hiện khuôn mặt"}

    # Xử lý từng khuôn mặt
    best_user = None
    best_score = -1
    result_info = []

    for i, face in enumerate(faces):
        x1, y1, x2, y2, _ = map(int, face)
        face_crop, _ = crop_face_expanded(frame, x1, y1, x2, y2)

        # Kiểm tra giả mạo
        if not detect_liveness(face_crop):
            color = (0, 0, 255)
            label = "FAKE"
            safe_putText(frame, label, (x1, y1 - 10), color=color)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            result_info.append({"face": i, "status": "fake"})
            continue

        try:
            emb = embedder.get(face_crop)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi khi trích embedding: {e}")

        # So sánh với tất cả user
        for user in USERS:
            user_embs = get_user_embeddings(user)
            if not user_embs:
                continue
            sims = [cosine_similarity(emb, ue) for ue in user_embs]
            max_sim = max(sims)
            if max_sim > best_score:
                best_score = max_sim
                best_user = user

        # Hiển thị kết quả
        if best_user and best_score > 0.7:
            name = best_user.get("name", "Unknown")
            acc = best_user.get("acc", "unknown")
            color = (0, 255, 0)
            label = f"{name} ({best_score:.2f})"
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            safe_putText(frame, label, (x1, y1 - 10), color=color)
            result_info.append({
                "face": i,
                "status": "success",
                "name": name,
                "acc": acc,
                "score": round(float(best_score), 3)
            })
        else:
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            safe_putText(frame, "UNKNOWN", (x1, y1 - 10), color=(0, 0, 255))
            result_info.append({
                "face": i,
                "status": "failed",
                "score": round(float(best_score), 3)
            })

    # === Lưu ảnh kết quả ===
    filename = os.path.join(OUTPUT_DIR, f"verify_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
    cv2.imwrite(filename, frame)
    print(f"[INFO] Ảnh kết quả đã lưu tại: {filename}")

    return JSONResponse({
        "status": "success",
        "faces": result_info,
        "saved_file": filename
    })
