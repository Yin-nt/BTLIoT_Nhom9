const express = require("express")
const auth = require("../middleware/auth")
const cabinetController = require("../controllers/cabinetController")

const router = express.Router()

router.get("/", auth, cabinetController.getAllCabinets)
router.post("/:cabinet_id/unlock", auth, cabinetController.unlockCabinet)
router.post("/:cabinet_id/lock", auth, cabinetController.lockCabinet)
router.get("/:cabinet_id/status", auth, cabinetController.getCabinetStatus)
router.get("/:cabinet_id/logs", auth, cabinetController.getAccessLogs)
router.post("/", auth, cabinetController.createCabinet)
router.put("/:id", auth, cabinetController.updateCabinet)
router.delete("/:id", auth, cabinetController.deleteCabinet)
router.post("/:id/assign-owner", auth, cabinetController.assignOwner)
router.post("/pairing/generate", auth, cabinetController.generatePairingCode)
router.post("/pairing/pair", cabinetController.pairDevice)
router.get("/alerts", auth, cabinetController.getAlerts)

router.post("/request-access", auth, cabinetController.requestCabinetAccess)
router.get("/requests", auth, cabinetController.getCabinetRequests)
router.post("/requests/:request_id/approve", auth, cabinetController.approveCabinetRequest)
router.post("/requests/:request_id/reject", auth, cabinetController.rejectCabinetRequest)

module.exports = router
