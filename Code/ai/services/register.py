import cv2
import sys
import os
import pickle
import numpy as np
from datetime import datetime

# Cho phép import từ thư mục gốc
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from detector.yolo_face import YOLOFace
from embedder.arcface import ArcFace
from utils.crop_face import crop_face_expanded  # CROP RỘNG

DATA_DIR = "data/users"
IMG_SAVE_DIR = "data/images"

def register():
    name = input("Nhập tên: ").strip()
    acc = input("Nhập mã: ").strip()

    if not name or not acc:
        print("Tên và mã không được để trống!")
        return

    # Kiểm tra acc đã tồn tại
    if os.path.exists(os.path.join(DATA_DIR, f"{acc}.pkl")):
        print(f"Mã {acc} đã tồn tại! Vui lòng chọn mã khác.")
        return

    os.makedirs(DATA_DIR, exist_ok=True)
    user_img_dir = os.path.join(IMG_SAVE_DIR, acc)
    os.makedirs(user_img_dir, exist_ok=True)

    detector = YOLOFace()
    embedder = ArcFace()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Không mở được camera!")
        return

    print("\nHướng dẫn:")
    print(" - Nhìn vào camera, thay đổi góc mặt, ánh sáng, biểu cảm")
    print(" - Nhấn [SPACE] để chụp")
    print(" - Cần ít nhất 5 ảnh, tối đa 20")
    print(" - Nhấn [Q] để kết thúc\n")

    embeddings = []
    img_count = 0
    required_min = 5
    required_max = 20

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Không đọc được khung hình!")
            break

        faces = detector.detect(frame)
        display = frame.copy()

        status = f"Anh: {img_count}/{required_max} (it nhat {required_min})"
        color = (0, 255, 0) if img_count >= required_min else (0, 165, 255)

        cv2.putText(display, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.putText(display, "SPACE: Chup | Q: Ket thuc", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        if faces:
            # ÉP KIỂU INT
            x1, y1, x2, y2, _ = map(int, faces[0])
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 3)

            # CROP RỘNG
            face_crop_expanded, bbox_expanded = crop_face_expanded(frame, x1, y1, x2, y2)
            cv2.putText(display, "READY - SPACE TO CAPTURE", (x1, max(30, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow("Register - Multi Shots (Crop Rộng)", display)
        key = cv2.waitKey(1) & 0xFF

        if key == ord(' '):
            if not faces:
                print("Không phát hiện khuôn mặt, thử lại...")
                continue

            if img_count >= required_max:
                print(f"Đã đủ {required_max} ảnh!")
                continue

            # Lấy bbox và crop rộng
            x1, y1, x2, y2, _ = map(int, faces[0])
            face_crop_expanded, _ = crop_face_expanded(frame, x1, y1, x2, y2)

            # Embedding
            try:
                emb = embedder.get(face_crop_expanded)
                embeddings.append(emb)
                img_count += 1
            except Exception as e:
                print(f"Lỗi embedding: {e}")
                continue

            # Lưu ảnh RỘNG
            img_name = f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.jpg"
            img_path = os.path.join(user_img_dir, img_name)
            cv2.imwrite(img_path, face_crop_expanded)

            print(f"Ảnh {img_count} đã lưu → {img_path}")

        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    if img_count < required_min:
        print(f"Chỉ có {img_count} ảnh. Cần ít nhất {required_min} để đăng ký!")
        return

    # Tính mean embedding
    mean_emb = np.mean(embeddings, axis=0)

    user_data = {
        "name": name,
        "acc": acc,
        "embeddings": [e.tolist() for e in embeddings],  # Lưu tất cả
        "mean_embedding": mean_emb.tolist(),
        "num_images": len(embeddings),
        "registered_at": datetime.now().isoformat()
    }

    user_path = os.path.join(DATA_DIR, f"{acc}.pkl")
    with open(user_path, "wb") as f:
        pickle.dump(user_data, f)

    print(f"\nĐăng ký thành công!")
    print(f" - Tên: {name}")
    print(f" - Mã: {acc}")
    print(f" - Số ảnh: {len(embeddings)}")
    print(f" - File: {user_path}")

if __name__ == "__main__":
    register()
