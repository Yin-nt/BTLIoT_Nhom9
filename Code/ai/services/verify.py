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
OUTPUT_DIR = "output/verify"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# =====================
# Utility functions
# =====================

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

def safe_putText(frame, text, pos, font, scale, color, thickness):
    (w, h), _ = cv2.getTextSize(text, font, scale, thickness)
    x, y = pos
    h_frame, w_frame = frame.shape[:2]
    x = max(0, min(x, w_frame - w))
    y = max(h, min(y, h_frame))
    cv2.putText(frame, text, (x, y), font, scale, color, thickness)

# =====================
# Main verify logic
# =====================

def verify():
    users = load_users()
    if not users:
        print("CHƯA CÓ NGƯỜI DÙNG! Chạy register.py trước.")
        return

    detector = YOLOFace()
    embedder = ArcFace()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Không mở được camera!")
        return

    print("VERIFY STARTED - Nhấn 's' để lưu ảnh, 'q' để thoát")

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA NOT AVAILABLE", (50, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
            cv2.imshow("Verify - 1 Shot (Crop Rộng)", frame)
            if cv2.waitKey(100) & 0xFF == ord('q'):
                break
            continue

        faces = detector.detect(frame)
        display = frame.copy()

        if not faces:
            cv2.putText(display, "NO FACE DETECTED", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
        else:
            # ÉP KIỂU INT
            x1, y1, x2, y2, _ = map(int, faces[0])
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 3)

            # CROP RỘNG
            face_crop, _ = crop_face_expanded(frame, x1, y1, x2, y2)

            # === CHỐNG GIẢ MẠO ===
            if not detect_liveness(face_crop):
                safe_putText(display, "SPOOF DETECTED", (x1, y1 - 10),
                             cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)
                cv2.putText(display, "FAKE", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
            else:
                try:
                    emb = embedder.get(face_crop)
                    best_score = -1
                    best_user = None

                    # SO SÁNH VỚI TẤT CẢ EMBEDDING
                    for user in users:
                        user_embs = get_user_embeddings(user)
                        if not user_embs:
                            continue
                        sims = [cosine_similarity(emb, ue) for ue in user_embs]
                        max_sim = max(sims)
                        if max_sim > best_score:
                            best_score = max_sim
                            best_user = user

                    # HIỂN THỊ KẾT QUẢ
                    if best_user and best_score > 0.7:
                        name = best_user.get("name", "Unknown")
                        acc = best_user.get("acc", "unknown")
                        safe_putText(display, name, (x1, y1 - 40),
                                     cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)
                        safe_putText(display, f"{acc} [{best_score:.3f}]", (x1, y1 - 10),
                                     cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
                        cv2.putText(display, "VERIFIED", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)
                    else:
                        safe_putText(display, "UNKNOWN", (x1, y1 - 10),
                                     cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)
                        cv2.putText(display, f"Score: {best_score:.3f}", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)

                except Exception as e:
                    print("Lỗi embedding:", e)
                    safe_putText(display, "ERROR", (x1, y1 - 10),
                                 cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Hiển thị
        cv2.putText(display, "s=save | q=quit", (10, 470), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
        cv2.imshow("Verify - 1 Shot (Crop Rộng)", display)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            filename = os.path.join(OUTPUT_DIR, f"verify_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
            cv2.imwrite(filename, display)
            print(f"Đã lưu: {filename}")

    cap.release()
    cv2.destroyAllWindows()
    print("ĐÃ THOÁT AN TOÀN!")

if __name__ == "__main__":
    verify()
