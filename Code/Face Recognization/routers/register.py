# routers/register.py
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import cv2
import numpy as np
import os
import pickle
from datetime import datetime
from utils.crop_face import crop_face_expanded

router = APIRouter()

# Import models
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from detector.yolo_face import YOLOFace
from embedder.arcface import ArcFace

detector = YOLOFace()
embedder = ArcFace()

DATA_DIR = "data/users"
IMG_SAVE_DIR = "data/images"
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMG_SAVE_DIR, exist_ok=True)

@router.post("/register")
async def register_user(
    name: str = Form(..., description="Tên người dùng"),
    acc: str = Form(..., description="Mã định danh (ID)"),
    files: List[UploadFile] = File(..., description="5-20 ảnh khuôn mặt")
):
    """
    Đăng ký người dùng mới
    - **name**: Tên người dùng
    - **acc**: Mã định danh duy nhất
    - **files**: 5-20 ảnh khuôn mặt (JPG/PNG)
    """
    print("\n" + "="*50)
    print("📝 REGISTER REQUEST RECEIVED")
    print(f"👤 Name: {name}")
    print(f"🆔 Account: {acc}")
    print(f"📸 Files: {len(files)} images")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*50)
    
    # === VALIDATION ===
    if len(files) < 5:
        print("❌ ERROR: Not enough images (need ≥5)")
        raise HTTPException(status_code=400, detail="Cần ít nhất 5 ảnh!")
    if len(files) > 20:
        print("❌ ERROR: Too many images (max 20)")
        raise HTTPException(status_code=400, detail="Tối đa 20 ảnh!")
    if os.path.exists(os.path.join(DATA_DIR, f"{acc}.pkl")):
        print(f"❌ ERROR: Account {acc} already exists")
        raise HTTPException(status_code=400, detail="Mã acc đã tồn tại!")

    embeddings = []
    saved_images = []

    for file in files:
        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            continue

        faces = detector.detect(frame)
        if not faces:
            continue

        # x1, y1, x2, y2, _ = faces[0]
        x1, y1, x2, y2, _ = map(int, faces[0])
        face_crop = frame[y1:y2, x1:x2]
        face_crop, bbox_expanded = crop_face_expanded(frame, x1, y1, x2, y2)

        # Lưu ảnh
        user_img_dir = os.path.join(IMG_SAVE_DIR, acc)
        os.makedirs(user_img_dir, exist_ok=True)
        img_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
        img_path = os.path.join(user_img_dir, img_name)
        cv2.imwrite(img_path, face_crop)
        saved_images.append(img_path)

        # Embedding
        try:
            emb = embedder.get(face_crop)
            embeddings.append(emb)
        except:
            continue

    if len(embeddings) < 3:
        print(f"❌ ERROR: Not enough valid images (got {len(embeddings)}, need ≥3)")
        raise HTTPException(status_code=400, detail="Không đủ ảnh hợp lệ (cần ≥3)")

    mean_emb = np.mean(embeddings, axis=0)
    user_data = {
        "name": name,
        "acc": acc,
        "embeddings": embeddings,
        "mean_embedding": mean_emb.tolist(),
        "num_images": len(embeddings),
        "registered_at": datetime.now().isoformat()
    }

    user_path = os.path.join(DATA_DIR, f"{acc}.pkl")
    with open(user_path, "wb") as f:
        pickle.dump(user_data, f)

    print(f"✅ REGISTERED: {name} ({acc}) with {len(embeddings)} images")
    print(f"💾 Saved to: {user_path}")
    
    return JSONResponse({
        "status": "success",
        "message": f"Đã đăng ký {name} ({acc}) với {len(embeddings)} ảnh",
        "saved_images": saved_images[-5:],
        "user_file": user_path
    })