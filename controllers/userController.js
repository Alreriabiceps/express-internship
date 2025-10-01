import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .populate("studentProfile")
      .populate("companyProfile")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select("-password")
      .populate("studentProfile")
      .populate("companyProfile");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user can access this profile
    if (req.user.role !== "admin" && req.user.id.toString() !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if user can update this profile
    if (req.user.role !== "admin" && req.user.id.toString() !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Remove sensitive fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.isVerified;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("studentProfile")
      .populate("companyProfile");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (req.user.id.toString() === id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload file to Cloudinary
    const { uploadToCloudinary } = await import("../utils/cloudinary.js");
    const result = await uploadToCloudinary(req.file);
    const profilePictureUrl = result.secure_url;

    // Clean up temporary file
    const fs = await import("fs");
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    // Update user profile based on role
    let user;
    if (req.user.role === "student") {
      const Student = (await import("../models/Student.js")).default;
      user = await Student.findByIdAndUpdate(
        req.user.id,
        { profilePicUrl: profilePictureUrl },
        { new: true }
      ).select("-password");
    } else if (req.user.role === "company") {
      const Company = (await import("../models/Company.js")).default;
      user = await Company.findByIdAndUpdate(
        req.user.id,
        { profilePicUrl: profilePictureUrl },
        { new: true }
      ).select("-password");
    } else if (req.user.role === "admin") {
      user = await User.findByIdAndUpdate(
        req.user.id,
        { profilePicUrl: profilePictureUrl },
        { new: true }
      ).select("-password");
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile picture uploaded successfully",
      profilePictureUrl: profilePictureUrl,
      user,
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ message: "Server error" });
  }
};
