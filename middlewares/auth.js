import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";

// Generate JWT token
export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers first (for API requests), then cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      const authHeader = req.headers.authorization;
      token = authHeader.split(" ")[1];

      console.log("🔍 Using header token:", token.substring(0, 50) + "...");
      console.log("🔍 Token extraction:", {
        authHeader: authHeader,
        extractedToken: token,
        tokenLength: token ? token.length : 0,
        extractedTokenPreview: token ? token.substring(0, 50) + "..." : "none",
        authHeaderPreview: authHeader.substring(0, 50) + "...",
      });
    } else if (req.cookies.token) {
      token = req.cookies.token;
      console.log("🍪 Using cookie token:", token.substring(0, 50) + "...");
    }

    // Debug logging
    console.log("🔍 Auth Debug:", {
      url: req.url,
      method: req.method,
      hasCookie: !!req.cookies.token,
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization,
      token: token ? `${token.substring(0, 20)}...` : "none",
    });

    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded:", { id: decoded.id, role: decoded.role });
    console.log("🔍 Full decoded payload:", decoded);
    console.log(
      "🔍 Token used for verification:",
      token.substring(0, 50) + "..."
    );

    // Handle both 'id' and 'userId' field names for backward compatibility
    const userId = decoded.id || decoded.userId;
    let userRole = decoded.role;

    console.log("🔍 Extracted user info:", { userId, userRole });
    console.log("🔍 All token fields:", Object.keys(decoded));

    // If role is missing, try to determine it from the user data
    if (!userRole && userId) {
      console.log(
        "⚠️ Role missing from token, attempting to determine from user data"
      );

      // Try to find user in all collections to determine role
      console.log("🔍 Searching for userId:", userId);
      let user = await Student.findById(userId).select("-password");
      console.log("🔍 Student lookup result:", user ? "Found" : "Not found");

      if (user) {
        userRole = "student";
        console.log("✅ Found user as student");
      } else {
        user = await Company.findById(userId).select("-password");
        console.log("🔍 Company lookup result:", user ? "Found" : "Not found");

        if (user) {
          userRole = "company";
          console.log("✅ Found user as company");
        } else {
          user = await User.findById(userId).select("-password");
          console.log("🔍 User lookup result:", user ? "Found" : "Not found");

          if (user) {
            userRole = "admin";
            console.log("✅ Found user as admin");
          } else {
            console.log("❌ User not found in any collection");
            console.log("🔍 Attempted searches for userId:", userId);
          }
        }
      }
    }

    if (!userId || !userRole) {
      console.log("❌ Missing userId or role in token");
      console.log("🔍 Final state:", { userId, userRole });

      // If we have a userId but no role, it means the user doesn't exist
      if (userId && !userRole) {
        return res.status(401).json({
          success: false,
          message: "User not found. Please log in again.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Token is not valid. Missing user information.",
      });
    }

    // Get user from appropriate collection based on role
    let user;
    if (userRole === "student") {
      user = await Student.findById(userId).select("-password");
    } else if (userRole === "company") {
      user = await Company.findById(userId).select("-password");
    } else if (userRole === "admin") {
      user = await User.findById(userId).select("-password");
    }

    console.log(
      "👤 User found:",
      user
        ? { id: user._id, email: user.email, isActive: user.isActive }
        : "null"
    );

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        success: false,
        message: "Token is not valid. User not found.",
      });
    }

    if (!user.isActive) {
      console.log("❌ User account deactivated");
      return res.status(401).json({
        success: false,
        message: "Account is deactivated.",
      });
    }

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      role: userRole,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Token is not valid.",
    });
  }
};

// Authorize specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. User not authenticated.",
      });
    }

    // Flatten roles array if it's nested (e.g., [["admin", "company"]] -> ["admin", "company"])
    const allowedRoles = roles.flat();

    console.log("🔒 Authorization check:", {
      userRole: req.user.role,
      allowedRoles: allowedRoles,
      isAuthorized: allowedRoles.includes(req.user.role),
    });

    if (!allowedRoles.includes(req.user.role)) {
      console.log("❌ Access denied for role:", req.user.role);
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    console.log("✅ Access granted for role:", req.user.role);
    next();
  };
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};

// Check if user is student
export const isStudent = (req, res, next) => {
  if (!req.user || req.user.role !== "student") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Student privileges required.",
    });
  }
  next();
};

// Check if user is company
export const isCompany = (req, res, next) => {
  if (!req.user || req.user.role !== "company") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Company privileges required.",
    });
  }
  next();
};
