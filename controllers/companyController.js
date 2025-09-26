import User from "../models/User.js";
import Company from "../models/Company.js";

// Get company profile
export const getCompanyProfile = async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user._id }).populate(
      "user"
    );

    if (!company) {
      return res.status(404).json({ message: "Company profile not found" });
    }

    res.json(company);
  } catch (error) {
    console.error("Error fetching company profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update company profile
export const updateCompanyProfile = async (req, res) => {
  try {
    const updateData = req.body;

    const company = await Company.findOneAndUpdate(
      { user: req.user._id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).populate("user");

    res.json(company);
  } catch (error) {
    console.error("Error updating company profile:", error);
    res.status(500).json({ message: "Server error" });
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
    const { studentId, reason } = req.body;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const preferredApplicant = {
      studentId,
      reason,
      addedBy: req.user._id,
      createdAt: new Date(),
    };

    company.preferredApplicants.push(preferredApplicant);
    await company.save();

    res.json({ message: "Preferred applicant added successfully" });
  } catch (error) {
    console.error("Error adding preferred applicant:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove preferred applicant
export const removePreferredApplicant = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    company.preferredApplicants = company.preferredApplicants.filter(
      (applicant) => applicant.studentId.toString() !== studentId
    );
    await company.save();

    res.json({ message: "Preferred applicant removed successfully" });
  } catch (error) {
    console.error("Error removing preferred applicant:", error);
    res.status(500).json({ message: "Server error" });
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






