import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Validation rules
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("firstName").notEmpty().trim().withMessage("First name is required"),
  body("lastName").notEmpty().trim().withMessage("Last name is required"),
  body("role")
    .isIn(["student", "company", "admin"])
    .withMessage("Invalid role"),
  body("phone")
    .if(body("role").equals("student"))
    .matches(/^(\+639\d{9}|09\d{9})$/)
    .withMessage("Phone number must be 11 digits starting with 09 or +639"),
  body("phone")
    .if(body("role").equals("company"))
    .optional()
    .matches(/^(\+639\d{9}|09\d{9})$/)
    .withMessage("Phone number must be 11 digits starting with 09 or +639"),
  // Student-specific validation
  body("studentId")
    .if(body("role").equals("student"))
    .notEmpty()
    .trim()
    .withMessage("Student ID is required for students"),
  body("program")
    .if(body("role").equals("student"))
    .notEmpty()
    .trim()
    .withMessage("Program is required for students"),
  body("yearLevel")
    .if(body("role").equals("student"))
    .isIn(["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"])
    .withMessage("Invalid year level"),
  // Company-specific validation
  body("companyName")
    .if(body("role").equals("company"))
    .notEmpty()
    .trim()
    .withMessage("Company name is required for companies"),
  body("industry")
    .if(body("role").equals("company"))
    .notEmpty()
    .trim()
    .withMessage("Industry is required for companies"),
  body("companySize")
    .if(body("role").equals("company"))
    .isIn(["1-10", "11-50", "51-200", "201-500", "500+"])
    .withMessage("Invalid company size"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

// Routes
router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.post("/logout", logout);
router.get("/me", verifyToken, getMe);
router.put("/profile", verifyToken, updateProfile);
router.put(
  "/change-password",
  verifyToken,
  changePasswordValidation,
  changePassword
);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
