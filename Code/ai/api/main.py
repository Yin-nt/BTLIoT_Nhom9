# api/main.py
import os 
import uvicorn
from fastapi import FastAPI
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers import register, verify

app = FastAPI(title="Face API v3.0", version="3.0")

app.include_router(register.router, prefix="", tags=["register"])
app.include_router(verify.router, prefix="", tags=["verify"])

@app.get("/")
def home():
    return {"message": "Face Recognition API v3.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
