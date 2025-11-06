# Version 2
# detector/yolo_face.py
import cv2
import torch
import numpy as np
from ultralytics import YOLO

import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "yolov8n-face-lindevs.pt")

class YOLOFace:
    def __init__(self, model_path=MODEL_PATH, conf_threshold=0.5):
        self.model = YOLO(model_path)
        self.conf_threshold = conf_threshold
        print(f"YOLOFace LOADED: {model_path}")

    def detect(self, img_bgr):
        results = self.model.predict(img_bgr, conf=self.conf_threshold, verbose=False)
        boxes = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].int().tolist()
                conf = float(box.conf[0])
                if conf > self.conf_threshold:
                    boxes.append([x1, y1, x2, y2, conf])
        return boxes
