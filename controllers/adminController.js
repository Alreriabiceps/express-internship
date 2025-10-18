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
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

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

    // Date range setup - more flexible
    const dateQuery = {};
    if (startDate && endDate) {
      dateQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
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
        ] = await Promise.all([
          User.countDocuments(),
          Student.countDocuments(),
          Company.countDocuments(),
          User.countDocuments({ role: "admin" }),
          Company.countDocuments({ isVerified: true }),
          Student.countDocuments({ isInternshipReady: true }),
          Student.countDocuments({ isProfileHidden: true }),
          Company.countDocuments({ isProfileHidden: true }),
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
            verificationRate:
              totalCompanies > 0
                ? ((verifiedCompanies / totalCompanies) * 100).toFixed(1)
                : 0,
            readinessRate:
              totalStudents > 0
                ? ((internshipReadyStudents / totalStudents) * 100).toFixed(1)
                : 0,
          },
        };
        break;

      case "user-registrations":
        // User registration trends
        const registrationPipeline = [
          { $match: dateQuery },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                day: period === "day" ? { $dayOfMonth: "$createdAt" } : null,
              },
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
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ];

        const registrations = await User.aggregate(registrationPipeline);
        report = { registrations };
        break;

      case "student-programs":
        // Student program distribution
        const programStats = await Student.aggregate([
          { $group: { _id: "$program", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        report = { programStats };
        break;

      case "student-year-levels":
        // Student year level distribution
        const yearLevelStats = await Student.aggregate([
          { $group: { _id: "$yearLevel", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        report = { yearLevelStats };
        break;

      case "company-industries":
        // Company industry distribution
        const industryStats = await Company.aggregate([
          { $group: { _id: "$industry", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        report = { industryStats };
        break;

      case "company-sizes":
        // Company size distribution
        const sizeStats = await Company.aggregate([
          { $group: { _id: "$companySize", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        report = { sizeStats };
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
        // Student internship readiness by program
        const readinessStats = await Student.aggregate([
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
          { $sort: { readinessRate: -1 } },
        ]);
        report = { readinessStats };
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
        const activityStats = await Promise.all([
          // Student registrations
          Student.aggregate([
            { $match: dateQuery },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ]),
          // Company registrations
          Company.aggregate([
            { $match: dateQuery },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ]),
        ]);
        report = {
          studentActivity: activityStats[0],
          companyActivity: activityStats[1],
        };
        break;

      case "geographic-distribution":
        // Geographic distribution (if location data is available)
        const locationStats = await Promise.all([
          Student.aggregate([
            { $match: { address: { $exists: true, $ne: "" } } },
            { $group: { _id: "$address", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ]),
          Company.aggregate([
            { $match: { address: { $exists: true, $ne: "" } } },
            { $group: { _id: "$address", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
          ]),
        ]);
        report = {
          studentLocations: locationStats[0],
          companyLocations: locationStats[1],
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
