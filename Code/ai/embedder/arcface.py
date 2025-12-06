# embedder/arcface.py
import cv2
import numpy as np
import onnxruntime as ort
import os
from utils.crop_face import crop_face_expanded


MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "w600k_r50.onnx")

class ArcFace:
    def __init__(self, model_path=MODEL_PATH):
        self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        self.input_size = (112, 112)

    # embedder/arcface.py → CROP RỘNG HƠN
    def _preprocess(self, face_bgr):
        h, w = face_bgr.shape[:2]
        # MỞ RỘNG 30% TRÊN + DƯỚI, 20% TRÁI + PHẢI
        expand_h = int(h * 0.3)
        expand_w = int(w * 0.2)
        face_expanded = cv2.copyMakeBorder(
            face_bgr, expand_h, expand_h, expand_w, expand_w,
            cv2.BORDER_REPLICATE
        )
        face = cv2.resize(face_expanded, self.input_size)
        face = face.astype(np.float32)
        face = (face - 127.5) / 128.0
        face = face.transpose(2, 0, 1)[np.newaxis, ...]
        return face

    def get(self, face_bgr):
    # DÙNG CROP RỘNG
        face_crop, _ = crop_face_expanded(face_bgr, 0, 0, face_bgr.shape[1], face_bgr.shape[0])
        input_blob = self._preprocess(face_bgr)
        input_name = self.session.get_inputs()[0].name
        embedding = self.session.run(None, {input_name: input_blob})[0]
        embedding = embedding.flatten()
        # L2 normalize
        embedding = embedding / np.linalg.norm(embedding)
        return embedding
