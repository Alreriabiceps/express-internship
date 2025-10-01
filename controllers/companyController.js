import User from "../models/User.js";
import Company from "../models/Company.js";

// Get company profile
export const getCompanyProfile = async (req, res) => {
  try {
    console.log("🔍 Fetching company profile for user ID:", req.user.id);
    console.log("🔍 User email:", req.user.email);

    // Company model stores everything directly (no separate user reference)
    // req.user.id is the Company document _id
    const company = await Company.findById(req.user.id);

    if (!company) {
      console.error("❌ Company profile not found for ID:", req.user.id);
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    console.log("✅ Company profile found:", company.companyName);
    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("❌ Error fetching company profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update company profile
export const updateCompanyProfile = async (req, res) => {
  try {
    console.log("🔍 Updating company profile for user ID:", req.user.id);
    const updateData = req.body;

    console.log("📝 Update data received:", {
      ...updateData,
      password: updateData.password ? "[REDACTED]" : undefined,
    });

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.verified;
    delete updateData.isActive;

    // Company model stores everything directly
    const company = await Company.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!company) {
      console.error("❌ Company not found for ID:", req.user.id);
      return res.status(404).json({
        success: false,
        message: "Company profile not found",
      });
    }

    console.log("✅ Company profile updated:", company.companyName);
    res.json({
      success: true,
      data: company,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating company profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all companies
export const getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      industry,
      companySize,
      isVerified,
    } = req.query;
    const query = {};

    if (industry) {
      query.industry = industry;
    }

    if (companySize) {
      query.companySize = companySize;
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    const companies = await Company.find(query)
      .populate("user", "firstName lastName email phone profilePictureUrl")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Company.countDocuments(query);

    res.json({
      companies,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id).populate("user");

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Search companies
export const searchCompanies = async (req, res) => {
  try {
    const { q, industry, companySize } = req.query;
    const query = {};

    if (q) {
      query.$or = [
        { companyName: { $regex: q, $options: "i" } },
        { industry: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (industry) {
      query.industry = industry;
    }

    if (companySize) {
      query.companySize = companySize;
    }

    const companies = await Company.find(query)
      .populate("user", "firstName lastName email phone profilePictureUrl")
      .limit(20)
      .sort({ createdAt: -1 });

    res.json(companies);
  } catch (error) {
    console.error("Error searching companies:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add OJT slot
export const addOjtSlot = async (req, res) => {
  try {
    const { position, description, requirements, duration, startDate } =
      req.body;

    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    const slot = {
      position,
      description,
      requirements,
      duration,
      startDate,
      createdAt: new Date(),
    };

    company.ojtSlots.push(slot);
    await company.save();

    res.json({ message: "OJT slot added successfully" });
  } catch (error) {
    console.error("Error adding OJT slot:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update OJT slot
export const updateOjtSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const updateData = req.body;

    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    const slot = company.ojtSlots.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: "OJT slot not found" });
    }

    Object.assign(slot, updateData);
    await company.save();

    res.json({ message: "OJT slot updated successfully" });
  } catch (error) {
    console.error("Error updating OJT slot:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete OJT slot
export const deleteOjtSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    company.ojtSlots.pull(slotId);
    await company.save();

    res.json({ message: "OJT slot deleted successfully" });
  } catch (error) {
    console.error("Error deleting OJT slot:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add preferred applicant
export const addPreferredApplicant = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, notes } = req.body;

    console.log("➕ Adding preferred applicant:", {
      companyId: id,
      studentId,
      notes,
    });

    const company = await Company.findById(id);
    if (!company) {
      console.log("❌ Company not found:", id);
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if student is already in preferredApplicants
    const existingIndex = company.preferredApplicants.findIndex(
      (app) => app.studentId.toString() === studentId
    );

    if (existingIndex !== -1) {
      console.log("⚠️ Student already in preferred applicants");
      return res.status(400).json({
        success: false,
        message: "Student already in preferred applicants",
      });
    }

    const preferredApplicant = {
      studentId,
      notes,
      addedAt: new Date(),
    };

    company.preferredApplicants.push(preferredApplicant);
    await company.save();

    console.log("✅ Preferred applicant added successfully");
    res.json({
      success: true,
      message: "Preferred applicant added successfully",
    });
  } catch (error) {
    console.error("❌ Error adding preferred applicant:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Remove preferred applicant
export const removePreferredApplicant = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    console.log("🗑️ Removing preferred applicant:", {
      companyId: id,
      studentId,
    });

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.preferredApplicants = company.preferredApplicants.filter(
      (applicant) => applicant.studentId.toString() !== studentId
    );
    await company.save();

    console.log("✅ Preferred applicant removed successfully");
    res.json({
      success: true,
      message: "Preferred applicant removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing preferred applicant:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Verify company (admin only)
export const verifyCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, verificationNotes } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.isVerified = isVerified;
    company.verificationNotes = verificationNotes;
    company.verifiedAt = new Date();
    company.verifiedBy = req.user._id;

    await company.save();

    res.json({ message: "Company verification updated successfully" });
  } catch (error) {
    console.error("Error verifying company:", error);
    res.status(500).json({ message: "Server error" });
  }
};
