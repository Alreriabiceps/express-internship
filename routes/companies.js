import express from "express";
import {
  getCompanyProfile,
  updateCompanyProfile,
  getAllCompanies,
  getCompanyById,
  searchCompanies,
  addOjtSlot,
  updateOjtSlot,
  deleteOjtSlot,
  addPreferredApplicant,
  removePreferredApplicant,
  verifyCompany,
} from "../controllers/companyController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.get("/profile", authorize("company"), getCompanyProfile);
router.put("/profile", authorize("company"), updateCompanyProfile);
router.get("/", authorize(["admin", "student"]), getAllCompanies);
router.get("/search", authorize(["admin", "student"]), searchCompanies);
router.get("/:id", authorize(["admin", "student"]), getCompanyById);
router.post("/slots", authorize("company"), addOjtSlot);
router.put("/slots/:slotId", authorize("company"), updateOjtSlot);
router.delete("/slots/:slotId", authorize("company"), deleteOjtSlot);
router.post(
  "/:id/preferred-applicants",
  authorize("company"),
  addPreferredApplicant
);
router.delete(
  "/:id/preferred-applicants/:studentId",
  authorize("company"),
  removePreferredApplicant
);
router.put("/:id/verify", authorize("admin"), verifyCompany);

export default router;






