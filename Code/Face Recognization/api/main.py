# api/main.py
import os 
import uvicorn
from fastapi import FastAPI
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers import register, verify

app = FastAPI(title="Face API v3.0", version="3.0")

app.include_router(register.router, prefix="/api")
app.include_router(verify.router, prefix="/api")

@app.get("/")
def home():
    return {"message": "Face Recognition API v3.0"}
if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)

# python -m venv .venv
# .venv\Scripts\activate
# pip install -r requirements.txt
# python -m uvicorn "api.main:app" --host 0.0.0.0 --port 8000 --reload
# curl -X POST "http://127.0.0.1:8000/api/verify" -F "file=@\"C:\Users\nv770\OneDrive\Desktop\IOT\BTLIoT_Nhom9\Code\Face Recognization\test.jpg\""
# curl -X POST "http://127.0.0.1:8000/api/register" -F "name=Nguyen Nam Vu_mo" -F "acc=acc05" -F "files=@\"C:\Users\nv770\OneDrive\Desktop\IOT\BTLIoT_Nhom9\Code\Face Recognization\vu_mo.jpg\"" -F "files=@\"C:\Users\nv770\OneDrive\Desktop\IOT\BTLIoT_Nhom9\Code\Face Recognization\vu_mo.jpg\"" -F "files=@\"C:\Users\nv770\OneDrive\Desktop\IOT\BTLIoT_Nhom9\Code\Face Recognization\vu_mo.jpg\"" -F "files=@\"C:\Users\nv770\OneDrive\Desktop\IOT\BTLIoT_Nhom9\Code\Face Recognization\vu_mo.jpg\"" -F "files=@\"C:\Users\nv770\OneDrive\Desktop\IOT\BTLIoT_Nhom9\Code\Face Recognization\vu1.jpg\""
