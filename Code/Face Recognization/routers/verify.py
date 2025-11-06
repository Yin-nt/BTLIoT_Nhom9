# routers/verify.py → ĐÃ SỬA: HỖ TRỢ TẤT CẢ TRƯỜNG HỢP + SO SÁNH TẤT CẢ
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import os
import pickle
from datetime import datetime
from utils.crop_face import crop_face_expanded

router = APIRouter()

# Import đúng
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from detector.yolo_face import YOLOFace
from embedder.arcface import ArcFace

detector = YOLOFace()
embedder = ArcFace()
DATA_DIR = "data/users"

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
    if not USERS:
        raise HTTPException(status_code=400, detail="Chưa có người dùng! Chạy register trước.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Ảnh không hợp lệ!")

    faces = detector.detect(frame)
    if not faces:
        return {"status": "failed", "message": "Không phát hiện khuôn mặt"}

    # x1, y1, x2, y2, _ = faces[0]
    x1, y1, x2, y2, _ = map(int, faces[0])
    face_crop = frame[y1:y2, x1:x2]
    face_crop, _ = crop_face_expanded(frame, x1, y1, x2, y2)

    # === CHỐNG GIẢ MẠO ===
    if not detect_liveness(face_crop):
        return {"status": "failed", "message": "Giả mạo (ảnh tĩnh)"}

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
    if best_user and best_score > 0.7:
        return {
            "status": "success",
            "name": best_user.get("name", "Unknown"),
            "acc": best_user.get("acc", "unknown"),
            "score": round(float(best_score), 3),
            "liveness": "live",
            "matched_from": "all_embeddings"  # hoặc mean
        }
    else:
        return {
            "status": "failed",
            "message": "Không nhận diện được",
            "best_score": round(float(best_score), 3) if best_score > -1 else None
        }