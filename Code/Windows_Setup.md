# Smart Cabinet - Troubleshooting Guide

## Common Errors and Solutions

### 1. AI Service: `ModuleNotFoundError: No module named 'uvicorn'`

**Problem:** Dependencies not installed in virtual environment

**Solution:**
\`\`\`bash
# Windows
cd ai
venv\Scripts\activate
pip install -r requirements.txt

# Linux/Mac
cd ai
source venv/bin/activate
pip install -r requirements.txt
\`\`\`

**Quick Fix - Run Setup Script:**
\`\`\`bash
# Windows
cd ai
setup.bat

# Linux/Mac
cd ai
chmod +x setup.sh
./setup.sh
\`\`\`

---

### 2. Backend: `Route.get() requires a callback function`

**Problem:** Syntax error in route handlers or missing async/await

**Solution 1 - Restart nodemon:**
\`\`\`bash
# Kill the process
# Windows: Ctrl + C
# Linux/Mac: Ctrl + C

# Start again
npm run dev
\`\`\`

**Solution 2 - Clear node cache:**
\`\`\`bash
# Stop the server, then:
rm -rf node_modules
npm install
npm run dev
\`\`\`

**Solution 3 - Check routes/users.js:**
Make sure all route handlers are async functions:
\`\`\`javascript
// Correct ✓
router.get('/', auth, async (req, res) => { ... })

// Wrong ✗
router.get('/', auth, (req, res) => { ... })  // Missing async
\`\`\`

---

### 3. MySQL: `Error: Unknown database 'smart_cabinet'`

**Problem:** Database not created or auto-creation failed

**Solution - Manual Creation:**
\`\`\`bash
mysql -u root -p
\`\`\`
\`\`\`sql
CREATE DATABASE smart_cabinet;
EXIT;
\`\`\`

Then restart backend:
\`\`\`bash
npm run dev
\`\`\`

---

### 4. Port Already in Use

**Problem:** Port 3000 (backend) or 8000 (AI) already occupied

**Windows:**
\`\`\`cmd
# Find process using port
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Kill process (replace PID)
taskkill /PID <PID> /F
\`\`\`

**Linux/Mac:**
\`\`\`bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
\`\`\`

---

### 5. Python Virtual Environment Not Activating (Windows)

**Problem:** `execution policy` error

**Solution:**
\`\`\`powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then activate
cd ai
venv\Scripts\activate
\`\`\`

---

### 6. Frontend: Cannot connect to backend

**Problem:** Backend URL misconfigured or backend not running

**Check:**
1. Backend is running on http://localhost:3000
2. AI service is running on http://localhost:8000
3. Check `fe/.env.local`:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_AI_URL=http://localhost:8000
\`\`\`

---

### 7. MQTT Connection Failed

**Problem:** Mosquitto not running or HiveMQ credentials wrong

**Solution - Local Mosquitto:**
\`\`\`bash
# Windows
mosquitto -v

# Linux/Mac
sudo systemctl start mosquitto
sudo systemctl status mosquitto
\`\`\`

**Solution - HiveMQ Cloud:**
Check credentials in `be/.env`:
\`\`\`env
MQTT_BROKER=your-cluster.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
\`\`\`

---

### 8. Face Detection Not Working

**Problem:** YOLOFace model not found

**Solution:**
\`\`\`bash
cd ai
# Download model (should be in ai/models/)
# Check ai/config.yaml points to correct path
\`\`\`

Make sure `ai/models/yolov8n-face.pt` exists

---

### 9. Database Connection Pool Exhausted

**Problem:** Too many connections or connections not closed

**Solution:**
\`\`\`javascript
// In be/src/config/database.js
// Increase pool size
const pool = mysql.createPool({
  // ... other config
  connectionLimit: 20,  // Increase from 10
  waitForConnections: true,
  queueLimit: 0
})
\`\`\`

Restart backend after change.

---

### 10. Image Upload Fails (413 Payload Too Large)

**Problem:** Image size exceeds limit

**Solution:**
In `be/src/index.js`, increase limit:
\`\`\`javascript
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
\`\`\`

---

## Quick Diagnostic Checklist

Before asking for help, verify:

- [ ] MySQL is running: `mysql -u root -p`
- [ ] Database `smart_cabinet` exists
- [ ] Backend is running: http://localhost:3000/api/health
- [ ] AI service is running: http://localhost:8000
- [ ] Python venv is activated
- [ ] All dependencies installed:
  - Backend: `npm install` in `be/`
  - Frontend: `npm install` in `fe/`
  - AI: `pip install -r requirements.txt` in `ai/`
- [ ] Environment variables configured:
  - `be/.env`
  - `fe/.env.local`
  - `ai/config.yaml`

---

## Still Having Issues?

1. **Check logs** - Look for specific error messages
2. **Restart everything** - Stop all services and start fresh
3. **Run setup scripts** - Use `setup.bat` or `setup.sh` in each directory
4. **Check versions:**
   - Node.js: v18 or higher
   - Python: 3.9 or higher
   - MySQL: 8.0 or higher

---

## Getting Help

When reporting issues, include:
- Operating System (Windows/Mac/Linux)
- Full error message
- Steps to reproduce
- Output of `node --version`, `python --version`, `mysql --version`
