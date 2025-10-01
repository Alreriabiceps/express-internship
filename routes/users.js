import express from "express";
import multer from "multer";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfilePicture,
} from "../controllers/userController.js";
import { verifyToken, authorize } from "../middlewares/auth.js";
import { upload } from "../utils/cloudinary.js";

// Use memory storage so we don't need a local uploads/ folder (works on Render)
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.get("/", authorize("admin"), getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", authorize("admin"), deleteUser);
// Debug route to test multer
router.post(
  "/test-upload",
  memoryUpload.single("profilePicture"),
  (req, res) => {
    console.log("🚨 DEBUG: Test upload route hit");
    console.log("  req.file:", req.file ? "Present" : "Missing");
    if (req.file) {
      console.log("  File details:", {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
      });
    }
    res.json({ message: "Test route hit", file: req.file });
  }
);

// Photo upload route
router.post(
  "/upload-profile-picture",
  memoryUpload.single("profilePicture"),
  uploadProfilePicture
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ message: error.message });
  }
  if (error.message === "Only image files are allowed!") {
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

export default router;
