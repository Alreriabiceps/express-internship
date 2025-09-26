import User from "../models/User.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import Notification from "../models/Notification.js";

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await Student.countDocuments();
    const totalCompanies = await Company.countDocuments();
    const verifiedCompanies = await Company.countDocuments({
      isVerified: true,
    });
    const pendingVerifications = await Company.countDocuments({
      isVerified: false,
    });

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentStudents = await Student.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentCompanies = await Company.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);

    // Students by program
    const studentsByProgram = await Student.aggregate([
      { $group: { _id: "$program", count: { $sum: 1 } } },
    ]);

    // Companies by industry
    const companiesByIndustry = await Company.aggregate([
      { $group: { _id: "$industry", count: { $sum: 1 } } },
    ]);

    res.json({
      totalUsers,
      totalStudents,
      totalCompanies,
      verifiedCompanies,
      pendingVerifications,
      recentUsers,
      recentStudents,
      recentCompanies,
      usersByRole,
      studentsByProgram,
      companiesByIndustry,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users with pagination and filters
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, isVerified } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
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

// Get pending verifications
export const getPendingVerifications = async (req, res) => {
  try {
    const companies = await Company.find({ isVerified: false })
      .populate("user", "firstName lastName email phone")
      .sort({ createdAt: -1 });

    res.json(companies);
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify user
export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, verificationNotes } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVerified = isVerified;
    user.verificationNotes = verificationNotes;
    user.verifiedAt = new Date();
    user.verifiedBy = req.user._id;

    await user.save();

    // Create notification
    await Notification.create({
      user: id,
      type: "verification",
      title: isVerified ? "Account Verified" : "Account Verification Rejected",
      message: isVerified
        ? "Your account has been verified successfully!"
        : `Your account verification was rejected. Reason: ${verificationNotes}`,
      priority: "high",
    });

    res.json({ message: "User verification updated successfully" });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject user verification
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVerified = false;
    user.verificationNotes = reason;
    user.verifiedAt = new Date();
    user.verifiedBy = req.user._id;

    await user.save();

    // Create notification
    await Notification.create({
      user: id,
      type: "verification",
      title: "Account Verification Rejected",
      message: `Your account verification was rejected. Reason: ${reason}`,
      priority: "high",
    });

    res.json({ message: "User verification rejected successfully" });
  } catch (error) {
    console.error("Error rejecting user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get system logs
export const getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // This would typically come from a logs collection
    // For now, we'll return a placeholder
    const logs = [];
    const total = 0;

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching system logs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create announcement
export const createSystemAnnouncement = async (req, res) => {
  try {
    const { title, message, targetAudience, priority = "medium" } = req.body;

    let targetUsers = [];

    if (targetAudience === "all") {
      targetUsers = await User.find({}, "_id");
    } else if (targetAudience === "students") {
      targetUsers = await User.find({ role: "student" }, "_id");
    } else if (targetAudience === "companies") {
      targetUsers = await User.find({ role: "company" }, "_id");
    }

    // Create notifications for all target users
    const notifications = targetUsers.map((user) => ({
      user: user._id,
      type: "announcement",
      title,
      message,
      priority,
      createdAt: new Date(),
    }));

    await Notification.insertMany(notifications);

    res.json({ message: "Announcement created successfully" });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get reports
export const getReports = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let report = {};

    switch (type) {
      case "user-registrations":
        const query = {};
        if (startDate && endDate) {
          query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          };
        }

        const registrations = await User.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: { $dayOfMonth: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);

        report = { registrations };
        break;

      case "student-programs":
        const programStats = await Student.aggregate([
          { $group: { _id: "$program", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        report = { programStats };
        break;

      case "company-industries":
        const industryStats = await Company.aggregate([
          { $group: { _id: "$industry", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        report = { industryStats };
        break;

      default:
        return res.status(400).json({ message: "Invalid report type" });
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Server error" });
  }
};
