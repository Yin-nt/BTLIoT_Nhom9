# utils/crop_face.py
import cv2
import numpy as np

def crop_face_expanded(frame, x1, y1, x2, y2, padding_ratio=0.4):
    # return frame, (x1, y1, x2, y2)
    """
    Crop khuôn mặt + mở rộng an toàn
    Đảm bảo tọa độ là int
    """
    h, w = frame.shape[:2]

    # ÉP KIỂU INT NGAY TỪ ĐẦU
    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

    face_h = y2 - y1
    face_w = x2 - x1

    # Tính padding
    pad_h = int(face_h * padding_ratio)
    pad_w = int(face_w * (padding_ratio * 0.75))

    # Mở rộng + giới hạn trong khung hình
    new_x1 = max(0, x1 - pad_w)
    new_y1 = max(0, y1 - int(pad_h * 1.2))  # tóc
    new_x2 = min(w, x2 + pad_w)
    new_y2 = min(h, y2 + int(pad_h * 0.8))  # cổ

    # CROP AN TOÀN
    face_crop = frame[new_y1:new_y2, new_x1:new_x2].copy()

    # Resize về 112x112
    face_resized = cv2.resize(face_crop, (112, 112))
    return face_resized, (new_x1, new_y1, new_x2, new_y2)
