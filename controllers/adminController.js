import User from "../models/User.js";
import Student from "../models/Student.js";
import Company from "../models/Company.js";
import Notification from "../models/Notification.js";
import EvaluationTemplate from "../models/EvaluationTemplate.js";
import StudentEvaluation from "../models/StudentEvaluation.js";

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

// Get all students for admin
export const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      program,
      yearLevel,
      isActive,
    } = req.query;
    const query = {};

    // Build query filters
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { program: { $regex: search, $options: "i" } },
      ];
    }

    if (program) {
      query.program = program;
    }

    if (yearLevel) {
      query.yearLevel = yearLevel;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const students = await Student.find(query)
      .select("-password")
      .sort({ isInternshipReady: -1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .lean();

    const total = await Student.countDocuments(query);

    res.json({
      success: true,
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get all companies for admin
export const getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      industry,
      isActive,
      isVerified,
    } = req.query;
    const query = {};

    // Build query filters
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
      ];
    }

    if (industry) {
      query.industry = industry;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    const companies = await Company.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      companies,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get individual student details for admin
export const getStudentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Toggle student profile visibility
export const toggleStudentProfileVisibility = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    student.isProfileHidden = !student.isProfileHidden;
    await student.save();

    res.json({
      success: true,
      message: `Profile ${
        student.isProfileHidden ? "hidden" : "visible"
      } successfully`,
      isProfileHidden: student.isProfileHidden,
    });
  } catch (error) {
    console.error("Error toggling profile visibility:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Toggle student internship readiness
export const toggleStudentInternshipReadiness = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    student.isInternshipReady = !student.isInternshipReady;
    await student.save();

    res.json({
      success: true,
      message: `Student ${
        student.isInternshipReady ? "marked as" : "unmarked from"
      } internship ready`,
      isInternshipReady: student.isInternshipReady,
    });
  } catch (error) {
    console.error("Error toggling internship readiness:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update admin readiness checklist
export const updateAdminReadinessChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { profileCompleted, documentsCompleted, readyForDeployment } =
      req.body;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Initialize adminReadinessChecklist if it doesn't exist
    if (!student.adminReadinessChecklist) {
      student.adminReadinessChecklist = {
        profileCompleted: false,
        documentsCompleted: false,
        readyForDeployment: false,
      };
    }

    // Update the checklist
    if (profileCompleted !== undefined) {
      student.adminReadinessChecklist.profileCompleted = profileCompleted;
    }
    if (documentsCompleted !== undefined) {
      student.adminReadinessChecklist.documentsCompleted = documentsCompleted;
    }
    if (readyForDeployment !== undefined) {
      student.adminReadinessChecklist.readyForDeployment = readyForDeployment;
    }

    // Save will trigger the pre-save hook that updates isInternshipReady
    await student.save();

    res.json({
      success: true,
      message: "Admin readiness checklist updated",
      adminReadinessChecklist: student.adminReadinessChecklist,
      isInternshipReady: student.isInternshipReady,
    });
  } catch (error) {
    console.error("Error updating admin readiness checklist:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Toggle company profile visibility
export const toggleCompanyProfileVisibility = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    company.isProfileHidden = !company.isProfileHidden;
    await company.save();

    res.json({
      success: true,
      message: `Company ${
        company.isProfileHidden ? "hidden" : "visible"
      } successfully`,
      isProfileHidden: company.isProfileHidden,
    });
  } catch (error) {
    console.error("Error toggling company profile visibility:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Reset company password (admin only)
export const resetCompanyPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Set new password (will be hashed by pre-save hook)
    company.password = newPassword;
    await company.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting company password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Reset student password (admin only)
export const resetStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Set new password (will be hashed by pre-save hook)
    student.password = newPassword;
    await student.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting student password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get reports
// Get all internship postings from all companies
export const getAllInternshipPostings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { "ojtSlots.title": { $regex: search, $options: "i" } },
        { "ojtSlots.department": { $regex: search, $options: "i" } },
      ];
    }

    // Get all companies with their OJT slots (no pagination yet)
    const companies = await Company.find(query).sort({ createdAt: -1 });

    // Flatten OJT slots with company info
    const allPostings = [];
    companies.forEach((company) => {
      if (company.ojtSlots && company.ojtSlots.length > 0) {
        company.ojtSlots.forEach((slot, index) => {
          allPostings.push({
            _id: `${company._id}_${index}`, // Unique ID for each posting
            companyId: company._id,
            slotIndex: index,
            companyName: company.companyName,
            companyEmail: company.email,
            companyIndustry: company.industry,
            companySize: company.companySize,
            companyAddress: company.address,
            companyWebsite: company.website,
            companyDescription: company.description,
            companyLocation: company.location,
            isCompanyVerified: company.isVerified,
            isCompanyHidden: company.isProfileHidden,
            posting: {
              title: slot.title,
              description: slot.description,
              department: slot.department,
              requirements: slot.requirements,
              location: slot.location,
              responsibilities: slot.responsibilities,
              qualifications: slot.qualifications,
              benefits: slot.benefits,
              duration: slot.duration,
              positions: slot.positions,
              allowance: slot.allowance,
              workType: slot.workType,
              startDate: slot.startDate,
              endDate: slot.endDate,
              applicationDeadline: slot.applicationDeadline,
              status: slot.status,
              isActive: slot.isActive,
              approvalStatus: slot.approvalStatus,
              approvedAt: slot.approvedAt,
              approvedBy: slot.approvedBy,
              rejectionReason: slot.rejectionReason,
              createdAt: slot.createdAt || company.createdAt,
            },
            createdAt: slot.createdAt || company.createdAt,
          });
        });
      }
    });

    // Apply status filter if provided
    let filteredPostings = allPostings;
    if (status === "active") {
      filteredPostings = allPostings.filter(
        (posting) => posting.posting.isActive
      );
    } else if (status === "inactive") {
      filteredPostings = allPostings.filter(
        (posting) => !posting.posting.isActive
      );
    }

    // Apply pagination to the filtered postings
    const paginatedPostings = filteredPostings.slice(
      skip,
      skip + parseInt(limit)
    );

    // Get total count
    const totalCompanies = await Company.countDocuments(query);
    const totalPostings = filteredPostings.length;

    res.json({
      success: true,
      data: {
        postings: paginatedPostings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPostings / limit),
          totalPostings,
          totalCompanies,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching internship postings:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Toggle internship posting visibility
export const toggleInternshipPostingVisibility = async (req, res) => {
  try {
    const { companyId, slotIndex } = req.params;

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (!company.ojtSlots || !company.ojtSlots[slotIndex]) {
      return res.status(404).json({
        success: false,
        message: "Internship posting not found",
      });
    }

    // Toggle the isActive status of the specific OJT slot
    company.ojtSlots[slotIndex].isActive =
      !company.ojtSlots[slotIndex].isActive;
    await company.save();

    res.json({
      success: true,
      message: `Internship posting ${
        company.ojtSlots[slotIndex].isActive ? "activated" : "deactivated"
      } successfully`,
      isActive: company.ojtSlots[slotIndex].isActive,
    });
  } catch (error) {
    console.error("Error toggling internship posting visibility:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get reports and analytics
export const getReports = async (req, res) => {
  try {
    const { type, startDate, endDate, period = "month" } = req.query;

    // Date range setup - more flexible and accurate
    const dateQuery = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      dateQuery.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else if (startDate) {
      // Only start date provided
      dateQuery.createdAt = {
        $gte: new Date(startDate),
      };
    } else if (endDate) {
      // Only end date provided
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.createdAt = {
        $lte: end,
      };
    } else {
      // Default to all time if no date range provided
      // This ensures we show data even if it's older
      dateQuery.createdAt = { $exists: true };
    }

    let report = {};

    switch (type) {
      case "overview":
        // Platform overview statistics
        const [
          totalUsers,
          totalStudents,
          totalCompanies,
          totalAdmins,
          verifiedCompanies,
          internshipReadyStudents,
          hiddenStudents,
          hiddenCompanies,
          activeUsers,
          totalPostings,
          totalApplications,
          totalEvaluations,
        ] = await Promise.all([
          User.countDocuments(),
          Student.countDocuments(),
          Company.countDocuments(),
          User.countDocuments({ role: "admin" }),
          Company.countDocuments({ isVerified: true }),
          Student.countDocuments({ isInternshipReady: true }),
          Student.countDocuments({ isProfileHidden: true }),
          Company.countDocuments({ isProfileHidden: true }),
          User.countDocuments({ isActive: true }),
          // Count total internship postings
          Company.aggregate([
            { $unwind: { path: "$ojtSlots", preserveNullAndEmptyArrays: false } },
            { $count: "total" },
          ]).then((result) => result[0]?.total || 0),
          // Count total applications (preferred applicants)
          Company.aggregate([
            { $unwind: { path: "$preferredApplicants", preserveNullAndEmptyArrays: false } },
            { $count: "total" },
          ]).then((result) => result[0]?.total || 0),
          StudentEvaluation.countDocuments(),
        ]);

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const [
          recentUsers,
          recentStudents,
          recentCompanies,
          recentPostings,
          recentEvaluations,
        ] = await Promise.all([
          User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
          Student.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
          Company.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
          Company.aggregate([
            { $unwind: { path: "$ojtSlots", preserveNullAndEmptyArrays: false } },
            { $match: { "ojtSlots.createdAt": { $gte: thirtyDaysAgo } } },
            { $count: "total" },
          ]).then((result) => result[0]?.total || 0),
          StudentEvaluation.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        ]);

        report = {
          overview: {
            totalUsers,
            totalStudents,
            totalCompanies,
            totalAdmins,
            verifiedCompanies,
            internshipReadyStudents,
            hiddenStudents,
            hiddenCompanies,
            activeUsers,
            totalPostings,
            totalApplications,
            totalEvaluations,
            verificationRate:
              totalCompanies > 0
                ? ((verifiedCompanies / totalCompanies) * 100).toFixed(1)
                : 0,
            readinessRate:
              totalStudents > 0
                ? ((internshipReadyStudents / totalStudents) * 100).toFixed(1)
                : 0,
            activeUserRate:
              totalUsers > 0
                ? ((activeUsers / totalUsers) * 100).toFixed(1)
                : 0,
            recentActivity: {
              users: recentUsers,
              students: recentStudents,
              companies: recentCompanies,
              postings: recentPostings,
              evaluations: recentEvaluations,
            },
          },
        };
        break;

      case "user-registrations":
        // User registration trends
        const registrationGroupId = period === "day" 
          ? {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            }
          : period === "year"
          ? {
              year: { $year: "$createdAt" },
            }
          : {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            };

        const registrationPipeline = [
          { $match: dateQuery },
          {
            $group: {
              _id: registrationGroupId,
              count: { $sum: 1 },
              students: {
                $sum: { $cond: [{ $eq: ["$role", "student"] }, 1, 0] },
              },
              companies: {
                $sum: { $cond: [{ $eq: ["$role", "company"] }, 1, 0] },
              },
              admins: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
            },
          },
          { 
            $sort: period === "day" 
              ? { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
              : period === "year"
              ? { "_id.year": 1 }
              : { "_id.year": 1, "_id.month": 1 }
          },
        ];

        const registrations = await User.aggregate(registrationPipeline);
        // Format dates for better display
        const formattedRegistrations = registrations.map((reg) => {
          const dateLabel = period === "day"
            ? `${reg._id.year}-${String(reg._id.month).padStart(2, "0")}-${String(reg._id.day).padStart(2, "0")}`
            : period === "year"
            ? `${reg._id.year}`
            : `${reg._id.year}-${String(reg._id.month).padStart(2, "0")}`;
          return {
            ...reg,
            dateLabel,
          };
        });
        report = { registrations: formattedRegistrations };
        break;

      case "student-programs":
        // Student program distribution - use actual courses from database
        const programStats = await Student.aggregate([
          { $match: { program: { $exists: true, $ne: null, $ne: "" } } },
          { $group: { _id: "$program", count: { $sum: 1 } } },
        ]);
        
        // Get all unique programs from database to ensure we show all courses
        const allProgramsInSystem = await Student.distinct("program", {
          program: { $exists: true, $ne: null, $ne: "" },
        });
        
        // Create a map of existing stats
        const programStatsMap = {};
        programStats.forEach((stat) => {
          programStatsMap[stat._id] = stat.count;
        });
        
        // Combine: include all programs from system, even if they have 0 students
        const allProgramStats = allProgramsInSystem.map((program) => ({
          _id: program,
          count: programStatsMap[program] || 0,
        }));
        
        // Add percentage calculation
        const totalStudentsForPrograms = allProgramStats.reduce((sum, p) => sum + p.count, 0);
        const programStatsWithPercent = allProgramStats
          .map((p) => ({
            ...p,
            percentage: totalStudentsForPrograms > 0 
              ? ((p.count / totalStudentsForPrograms) * 100).toFixed(1)
              : 0,
          }))
          .sort((a, b) => {
            // Sort by count (descending), then alphabetically
            if (b.count !== a.count) return b.count - a.count;
            return a._id.localeCompare(b._id);
          });
        
        report = { programStats: programStatsWithPercent };
        break;

      case "student-year-levels":
        // Student year level distribution
        const yearLevelStats = await Student.aggregate([
          { $match: { yearLevel: { $exists: true, $ne: null, $ne: "" } } },
          { $group: { _id: "$yearLevel", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        // Add percentage and sort by year level order
        const yearLevelOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
        const totalForYearLevels = yearLevelStats.reduce((sum, y) => sum + y.count, 0);
        const yearLevelStatsWithPercent = yearLevelStats
          .map((y) => ({
            ...y,
            percentage: totalForYearLevels > 0 
              ? ((y.count / totalForYearLevels) * 100).toFixed(1)
              : 0,
            order: yearLevelOrder.indexOf(y._id) !== -1 ? yearLevelOrder.indexOf(y._id) : 999,
          }))
          .sort((a, b) => a.order - b.order);
        report = { yearLevelStats: yearLevelStatsWithPercent };
        break;

      case "company-industries":
        // Company industry distribution
        const industryStats = await Company.aggregate([
          { $match: { industry: { $exists: true, $ne: null, $ne: "" } } },
          { $group: { _id: "$industry", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        // Add percentage calculation
        const totalCompaniesForIndustries = industryStats.reduce((sum, i) => sum + i.count, 0);
        const industryStatsWithPercent = industryStats.map((i) => ({
          ...i,
          percentage: totalCompaniesForIndustries > 0 
            ? ((i.count / totalCompaniesForIndustries) * 100).toFixed(1)
            : 0,
        }));
        report = { industryStats: industryStatsWithPercent };
        break;

      case "company-sizes":
        // Company size distribution
        const sizeStats = await Company.aggregate([
          { $match: { companySize: { $exists: true, $ne: null, $ne: "" } } },
          { $group: { _id: "$companySize", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        // Add percentage and sort by size order
        const sizeOrder = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
        const totalForSizes = sizeStats.reduce((sum, s) => sum + s.count, 0);
        const sizeStatsWithPercent = sizeStats
          .map((s) => ({
            ...s,
            percentage: totalForSizes > 0 
              ? ((s.count / totalForSizes) * 100).toFixed(1)
              : 0,
            order: sizeOrder.indexOf(s._id) !== -1 ? sizeOrder.indexOf(s._id) : 999,
          }))
          .sort((a, b) => a.order - b.order);
        report = { sizeStats: sizeStatsWithPercent };
        break;

      case "verification-status":
        // Company verification status
        const verificationStats = await Company.aggregate([
          {
            $group: {
              _id: "$verificationStatus",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]);
        report = { verificationStats };
        break;

      case "internship-readiness":
        // Student internship readiness by program - use actual courses from database
        const readinessStats = await Student.aggregate([
          {
            $match: { program: { $exists: true, $ne: null, $ne: "" } },
          },
          {
            $group: {
              _id: "$program",
              total: { $sum: 1 },
              ready: {
                $sum: { $cond: [{ $eq: ["$isInternshipReady", true] }, 1, 0] },
              },
              notReady: {
                $sum: { $cond: [{ $eq: ["$isInternshipReady", false] }, 1, 0] },
              },
            },
          },
          {
            $addFields: {
              readinessRate: {
                $multiply: [{ $divide: ["$ready", "$total"] }, 100],
              },
            },
          },
        ]);
        
        // Get all unique programs from database
        const allProgramsForReadiness = await Student.distinct("program", {
          program: { $exists: true, $ne: null, $ne: "" },
        });
        
        // Create a map of existing stats
        const readinessStatsMap = {};
        readinessStats.forEach((stat) => {
          readinessStatsMap[stat._id] = stat;
        });
        
        // Combine: include all programs from system
        const allReadinessStats = allProgramsForReadiness.map((program) => {
          const existing = readinessStatsMap[program];
          if (existing) {
            return existing;
          }
          return {
            _id: program,
            total: 0,
            ready: 0,
            notReady: 0,
            readinessRate: 0,
          };
        });
        
        // Sort by readiness rate (descending), then by total students
        allReadinessStats.sort((a, b) => {
          if (b.readinessRate !== a.readinessRate) {
            return b.readinessRate - a.readinessRate;
          }
          return b.total - a.total;
        });
        
        report = { readinessStats: allReadinessStats };
        break;

      case "profile-visibility":
        // Profile visibility statistics
        const visibilityStats = await Promise.all([
          Student.aggregate([
            {
              $group: {
                _id: "$isProfileHidden",
                count: { $sum: 1 },
              },
            },
          ]),
          Company.aggregate([
            {
              $group: {
                _id: "$isProfileHidden",
                count: { $sum: 1 },
              },
            },
          ]),
        ]);
        report = {
          studentVisibility: visibilityStats[0],
          companyVisibility: visibilityStats[1],
        };
        break;

      case "activity-trends":
        // Activity trends over time
        const activityGroupId = period === "day"
          ? {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            }
          : period === "year"
          ? { year: { $year: "$createdAt" } }
          : {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            };

        const activityStats = await Promise.all([
          // Student registrations
          Student.aggregate([
            { $match: dateQuery },
            {
              $group: {
                _id: activityGroupId,
                count: { $sum: 1 },
              },
            },
            {
              $sort: period === "day"
                ? { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
                : period === "year"
                ? { "_id.year": 1 }
                : { "_id.year": 1, "_id.month": 1 },
            },
          ]),
          // Company registrations
          Company.aggregate([
            { $match: dateQuery },
            {
              $group: {
                _id: activityGroupId,
                count: { $sum: 1 },
              },
            },
            {
              $sort: period === "day"
                ? { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
                : period === "year"
                ? { "_id.year": 1 }
                : { "_id.year": 1, "_id.month": 1 },
            },
          ]),
        ]);

        // Format dates
        const formatActivityData = (data) => {
          return data.map((item) => {
            const dateLabel = period === "day"
              ? `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(item._id.day).padStart(2, "0")}`
              : period === "year"
              ? `${item._id.year}`
              : `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
            return {
              ...item,
              dateLabel,
            };
          });
        };

        report = {
          studentActivity: formatActivityData(activityStats[0]),
          companyActivity: formatActivityData(activityStats[1]),
        };
        break;

      case "geographic-distribution":
        // Geographic distribution (if location data is available)
        const locationStats = await Promise.all([
          Student.aggregate([
            {
              $match: {
                $or: [
                  { address: { $exists: true, $ne: null, $ne: "" } },
                  { location: { $exists: true, $ne: null, $ne: "" } },
                ],
              },
            },
            {
              $group: {
                _id: { $ifNull: ["$address", "$location"] },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ]),
          Company.aggregate([
            {
              $match: {
                $or: [
                  { address: { $exists: true, $ne: null, $ne: "" } },
                  { location: { $exists: true, $ne: null, $ne: "" } },
                ],
              },
            },
            {
              $group: {
                _id: { $ifNull: ["$address", "$location"] },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ]),
        ]);
        
        // Calculate totals for percentage
        const totalStudentsWithLocation = locationStats[0].reduce((sum, loc) => sum + loc.count, 0);
        const totalCompaniesWithLocation = locationStats[1].reduce((sum, loc) => sum + loc.count, 0);
        
        report = {
          studentLocations: locationStats[0].map((loc) => ({
            ...loc,
            percentage: totalStudentsWithLocation > 0
              ? ((loc.count / totalStudentsWithLocation) * 100).toFixed(1)
              : 0,
          })),
          companyLocations: locationStats[1].map((loc) => ({
            ...loc,
            percentage: totalCompaniesWithLocation > 0
              ? ((loc.count / totalCompaniesWithLocation) * 100).toFixed(1)
              : 0,
          })),
        };
        break;

      case "engagement-metrics":
        // Basic engagement metrics
        const [
          totalStudentsForEngagement,
          totalCompaniesForEngagement,
          studentsWithData,
          companiesWithData,
        ] = await Promise.all([
          Student.countDocuments(),
          Company.countDocuments(),
          // Students with any profile data
          Student.countDocuments({
            $or: [
              { skills: { $exists: true, $ne: [] } },
              { certifications: { $exists: true, $ne: [] } },
              { badges: { $exists: true, $ne: [] } },
            ],
          }),
          // Companies with any profile data
          Company.countDocuments({
            $or: [
              { ojtSlots: { $exists: true, $ne: [] } },
              { preferredApplicants: { $exists: true, $ne: [] } },
            ],
          }),
        ]);

        report = {
          engagement: {
            studentsWithData,
            companiesWithData,
            studentEngagementRate:
              totalStudentsForEngagement > 0
                ? (
                    (studentsWithData / totalStudentsForEngagement) *
                    100
                  ).toFixed(1)
                : 0,
            companyEngagementRate:
              totalCompaniesForEngagement > 0
                ? (
                    (companiesWithData / totalCompaniesForEngagement) *
                    100
                  ).toFixed(1)
                : 0,
          },
        };
        break;

      case "internship-postings":
        // Internship postings statistics
        const companiesWithSlots = await Company.find({
          ojtSlots: { $exists: true, $ne: [] },
        }).select("ojtSlots");

        let postingsCount = 0;
        let activePostings = 0;
        let closedPostings = 0;
        let pendingApproval = 0;
        let approvedPostings = 0;
        let rejectedPostings = 0;
        const postingsByIndustry = {};
        const postingsByStatus = {};
        const postingsByWorkType = {};

        companiesWithSlots.forEach((company) => {
          if (company.ojtSlots && company.ojtSlots.length > 0) {
            company.ojtSlots.forEach((slot) => {
              postingsCount++;
              
              // Status counts
              if (slot.status === "open") activePostings++;
              else if (slot.status === "closed" || slot.status === "filled") closedPostings++;
              
              // Approval status
              if (slot.approvalStatus === "pending") pendingApproval++;
              else if (slot.approvalStatus === "approved") approvedPostings++;
              else if (slot.approvalStatus === "rejected") rejectedPostings++;
              
              // By status
              const status = slot.status || "unknown";
              postingsByStatus[status] = (postingsByStatus[status] || 0) + 1;
              
              // By work type
              if (slot.workType) {
                postingsByWorkType[slot.workType] = (postingsByWorkType[slot.workType] || 0) + 1;
              }
            });
          }
        });

        // Get company industry for postings
        const companiesForIndustry = await Company.find({
          ojtSlots: { $exists: true, $ne: [] },
        }).select("industry ojtSlots");

        companiesForIndustry.forEach((company) => {
          if (company.ojtSlots && company.ojtSlots.length > 0) {
            const industry = company.industry || "Unknown";
            postingsByIndustry[industry] = (postingsByIndustry[industry] || 0) + company.ojtSlots.length;
          }
        });

        report = {
          internshipPostings: {
            total: postingsCount,
            active: activePostings,
            closed: closedPostings,
            pendingApproval,
            approved: approvedPostings,
            rejected: rejectedPostings,
            byStatus: Object.entries(postingsByStatus).map(([status, count]) => ({
              _id: status,
              count,
            })),
            byIndustry: Object.entries(postingsByIndustry)
              .map(([industry, count]) => ({
                _id: industry,
                count,
              }))
              .sort((a, b) => b.count - a.count),
            byWorkType: Object.entries(postingsByWorkType).map(([workType, count]) => ({
              _id: workType,
              count,
            })),
          },
        };
        break;

      case "applications":
        // Applications statistics (preferred applicants)
        const companiesWithApplicants = await Company.find({
          preferredApplicants: { $exists: true, $ne: [] },
        }).select("preferredApplicants ojtSlots industry");

        let applicationsCount = 0;
        const applicationsByCompany = [];
        const applicationsByIndustry = {};

        companiesWithApplicants.forEach((company) => {
          if (company.preferredApplicants && company.preferredApplicants.length > 0) {
            const appCount = company.preferredApplicants.length;
            applicationsCount += appCount;
            
            applicationsByCompany.push({
              companyName: company.companyName || "Unknown",
              companyId: company._id,
              count: appCount,
            });

            const industry = company.industry || "Unknown";
            applicationsByIndustry[industry] = (applicationsByIndustry[industry] || 0) + appCount;
          }
        });

        // Count total positions available
        const allCompanies = await Company.find().select("ojtSlots");
        let totalPositions = 0;
        allCompanies.forEach((company) => {
          if (company.ojtSlots && company.ojtSlots.length > 0) {
            company.ojtSlots.forEach((slot) => {
              totalPositions += slot.positions || 1;
            });
          }
        });

        report = {
          applications: {
            total: applicationsCount,
            totalPositions,
            applicationToPositionRatio: totalPositions > 0
              ? (applicationsCount / totalPositions).toFixed(2)
              : 0,
            byCompany: applicationsByCompany.sort((a, b) => b.count - a.count).slice(0, 20),
            byIndustry: Object.entries(applicationsByIndustry)
              .map(([industry, count]) => ({
                _id: industry,
                count,
              }))
              .sort((a, b) => b.count - a.count),
          },
        };
        break;

      case "evaluations":
        // Student evaluations statistics
        const evaluationStats = await StudentEvaluation.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]);

        const evaluationsByStatus = {};
        evaluationStats.forEach((stat) => {
          evaluationsByStatus[stat._id] = stat.count;
        });

        // Evaluations over time
        const evaluationsOverTime = await StudentEvaluation.aggregate([
          { $match: dateQuery },
          {
            $group: {
              _id: period === "day"
                ? {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                  }
                : period === "year"
                ? { year: { $year: "$createdAt" } }
                : {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                  },
              count: { $sum: 1 },
              pending: {
                $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
              },
              inProgress: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
              submitted: {
                $sum: { $cond: [{ $eq: ["$status", "submitted"] }, 1, 0] },
              },
            },
          },
          {
            $sort: period === "day"
              ? { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
              : period === "year"
              ? { "_id.year": 1 }
              : { "_id.year": 1, "_id.month": 1 },
          },
        ]);

        // Format dates
        const formattedEvaluationsOverTime = evaluationsOverTime.map((evaluation) => {
          const dateLabel = period === "day"
            ? `${evaluation._id.year}-${String(evaluation._id.month).padStart(2, "0")}-${String(evaluation._id.day).padStart(2, "0")}`
            : period === "year"
            ? `${evaluation._id.year}`
            : `${evaluation._id.year}-${String(evaluation._id.month).padStart(2, "0")}`;
          return {
            ...evaluation,
            dateLabel,
          };
        });

        const evaluationsTotal = await StudentEvaluation.countDocuments();
        const submittedEvaluations = evaluationsByStatus.submitted || 0;
        const pendingEvaluations = evaluationsByStatus.pending || 0;
        const inProgressEvaluations = evaluationsByStatus.in_progress || 0;

        report = {
          evaluations: {
            total: evaluationsTotal,
            pending: pendingEvaluations,
            inProgress: inProgressEvaluations,
            submitted: submittedEvaluations,
            submissionRate: evaluationsTotal > 0
              ? ((submittedEvaluations / evaluationsTotal) * 100).toFixed(1)
              : 0,
            byStatus: evaluationStats,
            overTime: formattedEvaluationsOverTime,
          },
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid report type",
        });
    }

    res.json({
      success: true,
      data: report,
      period: period,
      dateRange: {
        startDate:
          startDate ||
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Approve internship posting
export const approveInternshipPosting = async (req, res) => {
  try {
    const { companyId, slotIndex } = req.params;
    const { notes } = req.body;

    console.log("✅ Approving internship posting:", { companyId, slotIndex });

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const slot = company.ojtSlots[slotIndex];
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Internship posting not found",
      });
    }

    // Update approval status
    slot.approvalStatus = "approved";
    slot.approvedAt = new Date();
    slot.approvedBy = req.user.id;
    slot.rejectionReason = null; // Clear any previous rejection reason

    await company.save();

    // Create notification for company
    await Notification.create({
      userId: company._id,
      title: "Internship Posting Approved",
      message: `Your internship posting "${slot.title}" has been approved and is now live!`,
      type: "approval",
      priority: "high",
      isRead: false,
    });

    res.json({
      success: true,
      message: "Internship posting approved successfully",
      data: {
        approvalStatus: slot.approvalStatus,
        approvedAt: slot.approvedAt,
        approvedBy: slot.approvedBy,
      },
    });
  } catch (error) {
    console.error("❌ Error approving internship posting:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Reject internship posting
export const rejectInternshipPosting = async (req, res) => {
  try {
    const { companyId, slotIndex } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    console.log("❌ Rejecting internship posting:", { companyId, slotIndex });

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const slot = company.ojtSlots[slotIndex];
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Internship posting not found",
      });
    }

    // Update approval status
    slot.approvalStatus = "rejected";
    slot.approvedAt = new Date();
    slot.approvedBy = req.user.id;
    slot.rejectionReason = rejectionReason;

    await company.save();

    // Create notification for company
    await Notification.create({
      userId: company._id,
      title: "Internship Posting Rejected",
      message: `Your internship posting "${slot.title}" was rejected. Reason: ${rejectionReason}`,
      type: "rejection",
      priority: "high",
      isRead: false,
    });

    res.json({
      success: true,
      message: "Internship posting rejected successfully",
      data: {
        approvalStatus: slot.approvalStatus,
        approvedAt: slot.approvedAt,
        approvedBy: slot.approvedBy,
        rejectionReason: slot.rejectionReason,
      },
    });
  } catch (error) {
    console.error("❌ Error rejecting internship posting:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Get pending internship postings
export const getPendingInternshipPostings = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build query for companies with pending slots
    let query = {
      "ojtSlots.approvalStatus": "pending",
    };

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { "ojtSlots.title": { $regex: search, $options: "i" } },
        { "ojtSlots.department": { $regex: search, $options: "i" } },
      ];
    }

    // Get companies with pending slots
    const companies = await Company.find(query)
      .populate("verifiedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    // Flatten pending slots with company info
    const pendingPostings = [];
    companies.forEach((company) => {
      company.ojtSlots.forEach((slot, index) => {
        if (slot.approvalStatus === "pending") {
          pendingPostings.push({
            _id: `${company._id}_${index}`,
            companyId: company._id,
            slotIndex: index,
            companyName: company.companyName,
            companyEmail: company.email,
            companyIndustry: company.industry,
            companySize: company.companySize,
            companyAddress: company.address,
            companyWebsite: company.website,
            companyDescription: company.description,
            companyLocation: company.location,
            isCompanyVerified: company.isVerified,
            posting: {
              title: slot.title,
              description: slot.description,
              department: slot.department,
              requirements: slot.requirements,
              location: slot.location,
              responsibilities: slot.responsibilities,
              qualifications: slot.qualifications,
              benefits: slot.benefits,
              duration: slot.duration,
              positions: slot.positions,
              allowance: slot.allowance,
              workType: slot.workType,
              startDate: slot.startDate,
              endDate: slot.endDate,
              applicationDeadline: slot.applicationDeadline,
              status: slot.status,
              isActive: slot.isActive,
              approvalStatus: slot.approvalStatus,
              createdAt: slot.createdAt || company.createdAt,
            },
            createdAt: slot.createdAt || company.createdAt,
          });
        }
      });
    });

    // Apply pagination
    const paginatedPostings = pendingPostings.slice(
      skip,
      skip + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        postings: paginatedPostings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(pendingPostings.length / limit),
          totalPostings: pendingPostings.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting pending internship postings:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Undo approval (reset to pending)
export const undoApproval = async (req, res) => {
  try {
    const { companyId, slotIndex } = req.params;

    console.log("🔄 Undoing approval for internship posting:", {
      companyId,
      slotIndex,
    });

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const slot = company.ojtSlots[slotIndex];
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Internship posting not found",
      });
    }

    // Reset approval status to pending
    slot.approvalStatus = "pending";
    slot.approvedAt = null;
    slot.approvedBy = null;
    slot.rejectionReason = null;

    await company.save();

    // Create notification for company
    await Notification.create({
      userId: company._id,
      title: "Internship Posting Status Reset",
      message: `Your internship posting "${slot.title}" has been reset to pending review.`,
      type: "system_announcement",
      priority: "medium",
      isRead: false,
    });

    res.json({
      success: true,
      message: "Internship posting approval has been undone successfully",
      data: {
        approvalStatus: slot.approvalStatus,
        approvedAt: slot.approvedAt,
        approvedBy: slot.approvedBy,
      },
    });
  } catch (error) {
    console.error("❌ Error undoing approval:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Get all companies with their preferred applicants (whitelisted students)
export const getCompaniesWithPreferredApplicants = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get companies with their preferred applicants populated
    const companies = await Company.find(query)
      .populate({
        path: "preferredApplicants.studentId",
        select:
          "firstName lastName email studentId program yearLevel skills profilePicUrl",
      })
      .populate("verifiedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip(skip);

    const total = await Company.countDocuments(query);

    // Format the response
    const formattedCompanies = companies.map((company) => ({
      _id: company._id,
      companyName: company.companyName,
      email: company.email,
      industry: company.industry,
      companySize: company.companySize,
      website: company.website,
      location: company.location,
      isVerified: company.isVerified,
      verificationStatus: company.verificationStatus,
      verifiedAt: company.verifiedAt,
      verifiedBy: company.verifiedBy,
      preferredApplicants: company.preferredApplicants.map((pref) => ({
        _id: pref._id,
        studentId: pref.studentId,
        notes: pref.notes,
        addedAt: pref.addedAt,
        student: pref.studentId
          ? {
              _id: pref.studentId._id,
              firstName: pref.studentId.firstName,
              lastName: pref.studentId.lastName,
              email: pref.studentId.email,
              studentId: pref.studentId.studentId,
              program: pref.studentId.program,
              yearLevel: pref.studentId.yearLevel,
              skills: pref.studentId.skills,
              profilePicUrl: pref.studentId.profilePicUrl,
            }
          : null,
      })),
      totalPreferredApplicants: company.preferredApplicants.length,
      createdAt: company.createdAt,
    }));

    res.json({
      success: true,
      data: {
        companies: formattedCompanies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCompanies: total,
          totalPreferredApplicants: formattedCompanies.reduce(
            (sum, company) => sum + company.totalPreferredApplicants,
            0
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "❌ Error getting companies with preferred applicants:",
      error
    );
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

const buildSectionResponses = (sections = []) =>
  sections.map((section) => ({
    label: section.label,
    title: section.title,
    description: section.description,
    questions: section.questions.map((question) => ({
      prompt: question.prompt,
      description: question.description,
      rating: null,
      comments: "",
    })),
  }));

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Evaluation Templates CRUD
export const createEvaluationTemplate = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    };

    const template = await EvaluationTemplate.create(payload);

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("❌ Error creating evaluation template:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getEvaluationTemplates = async (req, res) => {
  try {
    const { course, isActive } = req.query;
    const query = {};

    if (course) {
      query.course = course;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const templates = await EvaluationTemplate.find(query).sort({
      updatedAt: -1,
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("❌ Error fetching evaluation templates:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getEvaluationTemplateById = async (req, res) => {
  try {
    const template = await EvaluationTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Evaluation template not found",
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("❌ Error fetching evaluation template:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateEvaluationTemplate = async (req, res) => {
  try {
    const template = await EvaluationTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Evaluation template not found",
      });
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("❌ Error updating evaluation template:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const deleteEvaluationTemplate = async (req, res) => {
  try {
    const template = await EvaluationTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Evaluation template not found",
      });
    }

    res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting evaluation template:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Assign evaluations to companies
export const assignStudentEvaluations = async (req, res) => {
  try {
    const {
      templateId,
      companyId,
      studentIds = [],
      trainingPeriod,
      internshipAssignment,
      dueDate,
      adminNotes,
    } = req.body;

    if (!templateId || !companyId || !studentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "Template, company, and at least one student are required to assign evaluations",
      });
    }

    const template = await EvaluationTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Evaluation template not found",
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const students = await Student.find({ _id: { $in: studentIds } });
    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: "No valid students found for assignment",
      });
    }

    const sectionsSnapshot = buildSectionResponses(template.sections);
    const createdEvaluations = [];
    const skipped = [];

    for (const student of students) {
      const existing = await StudentEvaluation.findOne({
        template: template._id,
        student: student._id,
        company: company._id,
        status: { $in: ["pending", "in_progress"] },
      });

      if (existing) {
        skipped.push(student._id);
        continue;
      }

      const evaluation = await StudentEvaluation.create({
        template: template._id,
        templateSnapshot: {
          name: template.name,
          sections: sectionsSnapshot,
          ratingScale: template.ratingScale,
        },
        student: student._id,
        company: company._id,
        studentInfo: {
          fullName: `${student.firstName} ${student.lastName}`,
          program: student.program,
          course: student.program,
          studentNumber: student.studentId,
          email: student.email,
        },
        companyInfo: {
          name: company.companyName,
          representative: `${company.firstName} ${company.lastName}`,
          email: company.email,
        },
        trainingPeriod: {
          from: parseDate(trainingPeriod?.from),
          to: parseDate(trainingPeriod?.to),
        },
        internshipAssignment,
        dueDate: parseDate(dueDate),
        adminNotes,
        status: "pending",
        sections: buildSectionResponses(template.sections),
      });

      createdEvaluations.push(evaluation);
    }

    if (createdEvaluations.length) {
      await Notification.create({
        userId: company._id,
        type: "system_announcement",
        title: "Student Evaluations Assigned",
        message: `${createdEvaluations.length} student evaluation(s) require your feedback.`,
        data: {
          relatedId: company._id,
        },
        priority: "medium",
      });

      // Emit real-time event to company
      try {
        const io = req.app?.get("io");
        if (io) {
          io.to(`user_${company._id}`).emit("evaluations_assigned", {
            count: createdEvaluations.length,
            evaluations: createdEvaluations.map((evaluation) => ({
              _id: evaluation._id,
              studentInfo: evaluation.studentInfo,
              templateSnapshot: evaluation.templateSnapshot,
              status: evaluation.status,
              dueDate: evaluation.dueDate,
            })),
            message: `${createdEvaluations.length} new student evaluation(s) have been assigned to you.`,
          });
          console.log(`✅ Real-time notification sent to company ${company._id}`);
        } else {
          console.warn("⚠️ Socket.IO instance not available for real-time notification");
        }
      } catch (socketError) {
        console.error("❌ Error emitting socket event:", socketError);
        // Don't fail the request if socket emission fails
      }
    }

    res.json({
      success: true,
      data: {
        created: createdEvaluations.length,
        skipped: skipped.length,
        totalRequested: studentIds.length,
      },
    });
  } catch (error) {
    console.error("❌ Error assigning student evaluations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getStudentEvaluations = async (req, res) => {
  try {
    const {
      status,
      companyId,
      studentId,
      page = 1,
      limit = 20,
      search = "",
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (companyId) {
      query.company = companyId;
    }

    if (studentId) {
      query.student = studentId;
    }

    if (search) {
      query.$or = [
        { "studentInfo.fullName": { $regex: search, $options: "i" } },
        { "companyInfo.name": { $regex: search, $options: "i" } },
        { internshipAssignment: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [evaluations, total] = await Promise.all([
      StudentEvaluation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("student", "firstName lastName email studentId program")
        .populate("company", "companyName email industry"),
      StudentEvaluation.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: evaluations,
      pagination: {
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching student evaluations:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getStudentEvaluationById = async (req, res) => {
  try {
    const evaluation = await StudentEvaluation.findById(req.params.id)
      .populate("student", "firstName lastName email studentId program")
      .populate("company", "companyName email industry");

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Student evaluation not found",
      });
    }

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    console.error("❌ Error fetching student evaluation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// Delete/Cancel student evaluation
export const deleteStudentEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await StudentEvaluation.findById(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Evaluation not found",
      });
    }

    // Delete the evaluation
    await StudentEvaluation.findByIdAndDelete(id);

    // Emit real-time event to company if evaluation was assigned
    try {
      const io = req.app?.get("io");
      if (io && evaluation.company) {
        io.to(`user_${evaluation.company}`).emit("evaluation_cancelled", {
          evaluationId: id,
          studentName: evaluation.studentInfo?.fullName || "Student",
          message: "An evaluation request has been cancelled by admin.",
        });
        console.log(`✅ Real-time notification sent to company ${evaluation.company}`);
      }
    } catch (socketError) {
      console.error("Error sending socket notification:", socketError);
      // Don't fail the request if socket fails
    }

    res.json({
      success: true,
      message: "Evaluation deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting student evaluation:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};




