import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  verifyUser,
  rejectUser,
  getPendingVerifications,
  getSystemLogs,
  createSystemAnnouncement,
  getReports,
} from "../controllers/adminController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(authorize("admin"));

// Routes
router.get("/dashboard", getDashboardStats);
router.get("/users", getAllUsers);
router.get("/pending-verifications", getPendingVerifications);
router.put("/users/:id/verify", verifyUser);
router.put("/users/:id/reject", rejectUser);
router.get("/logs", getSystemLogs);
router.post("/announcements", createSystemAnnouncement);
router.get("/reports", getReports);

export default router;







