import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import Notification from "../models/Notification.js";
import { generateToken } from "../middlewares/auth.js";
import { validationResult } from "express-validator";

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const {
      email,
      password,
      firstName,
      middleName,
      lastName,
      age,
      sex,
      role,
      phone,
      // Student-specific fields
      studentId,
      program,
      yearLevel,
      // Company-specific fields
      companyName,
      industry,
      companySize,
      website,
      location,
    } = req.body;

    // Check if user already exists in any collection
    const existingStudent = await Student.findOne({ email });
    const existingCompany = await Company.findOne({ email });
    const existingUser = await User.findOne({ email });

    if (existingStudent || existingCompany || existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    let newUser;

    if (role === "student") {
      // Create student
      newUser = await Student.create({
        email,
        password,
        firstName,
        middleName,
        lastName,
        age,
        sex,
        phone,
        studentId,
        program,
        yearLevel,
        skills: [],
        softSkills: [],
        certifications: [],
        preferredFields: {
          allowance: { min: 0, max: 50000 },
          location: location ? [location] : [],
          role: [],
          workType: "On-site",
        },
        readinessChecklist: [
          { requirement: "Resume Updated", completed: false },
          { requirement: "Portfolio Ready", completed: false },
          { requirement: "LinkedIn Optimized", completed: false },
          { requirement: "Skills Assessed", completed: false },
          { requirement: "Goals Defined", completed: false },
        ],
        endorsements: [],
        badges: [],
        isAvailable: true,
      });
    } else if (role === "company") {
      // Create company
      newUser = await Company.create({
        email,
        password,
        firstName,
        middleName,
        lastName,
        phone,
        companyName,
        industry,
        companySize,
        website,
        description: "",
        address: {},
        contactPerson: {},
        ojtSlots: [],
        preferredApplicants: [],
        rating: { average: 0, count: 0 },
        isVerified: false,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    // Generate JWT token
    const token = generateToken(newUser._id, role);

    // Create welcome notification
    await Notification.create({
      userId: newUser._id,
      title: "Welcome!",
      message: `Welcome to the Internship Portal! Your ${role} account has been created successfully.`,
      type: "welcome",
      isRead: false,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Try to find user in User collection first (covers all roles)
    let user = await User.findOne({ email });
    let userRole = user ? user.role : null;

    // If not found in User collection, try Student collection (legacy)
    if (!user) {
      console.log("👤 Not found in User, trying Student collection...");
      user = await Student.findOne({ email });
      userRole = "student";
    }

    // If not found in Student, try Company collection (legacy)
    if (!user) {
      console.log("👤 Not found in Student, trying Company collection...");
      user = await Company.findOne({ email });
      userRole = "company";
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, userRole);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // In a JWT-based system, logout is typically handled client-side
    // by removing the token from storage
    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    let user;

    // Find user based on role
    if (req.user.role === "student") {
      user = await Student.findById(req.user.id);
    } else if (req.user.role === "company") {
      user = await Company.findById(req.user.id);
    } else if (req.user.role === "admin") {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const updateData = req.body;
    let user;

    // Update user based on role
    if (req.user.role === "student") {
      user = await Student.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } else if (req.user.role === "company") {
      user = await Company.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } else if (req.user.role === "admin") {
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Upload profile picture
// @route   POST /api/auth/upload-profile-picture
// @access  Private
export const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const profilePictureUrl = req.file.path;
    let user;

    // Update user based on role
    if (req.user.role === "student") {
      user = await Student.findByIdAndUpdate(
        req.user.id,
        { profilePicUrl: profilePictureUrl },
        { new: true }
      );
    } else if (req.user.role === "company") {
      user = await Company.findByIdAndUpdate(
        req.user.id,
        { profilePicUrl: profilePictureUrl },
        { new: true }
      );
    } else if (req.user.role === "admin") {
      user = await User.findByIdAndUpdate(
        req.user.id,
        { profilePicUrl: profilePictureUrl },
        { new: true }
      );
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: {
        profilePictureUrl,
      },
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    let user;

    // Find user based on role
    if (req.user.role === "student") {
      user = await Student.findById(req.user.id);
    } else if (req.user.role === "company") {
      user = await Company.findById(req.user.id);
    } else if (req.user.role === "admin") {
      user = await User.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Try to find user in all collections
    let user = await Student.findOne({ email });
    if (!user) {
      user = await Company.findOne({ email });
    }
    if (!user) {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // TODO: Send email with reset token
    // For now, just return success
    res.json({
      success: true,
      message: "Password reset instructions sent to your email",
      data: {
        resetToken, // Remove this in production
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    let user = await Student.findById(decoded.id);
    if (!user) {
      user = await Company.findById(decoded.id);
    }
    if (!user) {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
