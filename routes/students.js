import express from "express";
import {
  getStudentProfile,
  updateStudentProfile,
  getAllStudents,
  getStudentById,
  searchStudents,
  endorseStudent,
  updateReadinessChecklist,
  addBadge,
  removeBadge,
} from "../controllers/studentController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.get("/profile", authorize("student"), getStudentProfile);
router.put("/profile", authorize("student"), updateStudentProfile);
router.get("/", authorize(["admin", "company"]), getAllStudents);
router.get("/search", authorize(["admin", "company"]), searchStudents);
router.get("/:id", authorize(["admin", "company"]), getStudentById);
router.post("/:id/endorse", authorize("admin"), endorseStudent);
router.put("/:id/checklist", authorize("admin"), updateReadinessChecklist);
router.post("/:id/badges", authorize("admin"), addBadge);
router.delete("/:id/badges/:badgeId", authorize("admin"), removeBadge);

export default router;






