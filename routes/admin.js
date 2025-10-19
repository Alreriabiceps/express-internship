import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  getAllStudents,
  getAllCompanies,
  getStudentDetails,
  toggleStudentProfileVisibility,
  toggleStudentInternshipReadiness,
  updateAdminReadinessChecklist,
  toggleCompanyProfileVisibility,
  resetStudentPassword,
  resetCompanyPassword,
  verifyUser,
  rejectUser,
  getPendingVerifications,
  getSystemLogs,
  createSystemAnnouncement,
  getReports,
  getAllInternshipPostings,
  toggleInternshipPostingVisibility,
  approveInternshipPosting,
  rejectInternshipPosting,
  getPendingInternshipPostings,
  undoApproval,
  getCompaniesWithPreferredApplicants,
} from "../controllers/adminController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken);
router.use(authorize("admin"));

// Routes
router.get("/dashboard", getDashboardStats);
router.get("/users", getAllUsers);
router.get("/students", getAllStudents);
router.get("/companies", getAllCompanies);
router.get("/students/:id", getStudentDetails);
router.put("/students/:id/toggle-visibility", toggleStudentProfileVisibility);
router.put("/students/:id/toggle-readiness", toggleStudentInternshipReadiness);
router.put(
  "/students/:id/admin-readiness-checklist",
  updateAdminReadinessChecklist
);
router.put("/students/:id/reset-password", resetStudentPassword);
router.put("/companies/:id/toggle-visibility", toggleCompanyProfileVisibility);
router.put("/companies/:id/reset-password", resetCompanyPassword);
router.get("/pending-verifications", getPendingVerifications);
router.put("/users/:id/verify", verifyUser);
router.put("/users/:id/reject", rejectUser);
router.get("/logs", getSystemLogs);
router.post("/announcements", createSystemAnnouncement);
router.get("/reports", getReports);

// Internship postings routes
router.get("/internship-postings", getAllInternshipPostings);
router.get("/internship-postings/pending", getPendingInternshipPostings);
router.put(
  "/internship-postings/:companyId/:slotIndex/toggle-visibility",
  toggleInternshipPostingVisibility
);
router.put(
  "/internship-postings/:companyId/:slotIndex/approve",
  approveInternshipPosting
);
router.put(
  "/internship-postings/:companyId/:slotIndex/reject",
  rejectInternshipPosting
);
router.put("/internship-postings/:companyId/:slotIndex/undo", undoApproval);

// Preferred applicants (whitelisted students) routes
router.get(
  "/companies/preferred-applicants",
  getCompaniesWithPreferredApplicants
);

export default router;
