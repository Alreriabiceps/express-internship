import Student from "../models/Student.js";
import Company from "../models/Company.js";

// Get student profile
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("Error fetching student profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update student profile
export const updateStudentProfile = async (req, res) => {
  try {
    console.log("\n🎓 ========== UPDATE STUDENT PROFILE REQUEST ==========");
    console.log("User ID:", req.user.id);
    console.log("User email:", req.user.email);

    const updateData = req.body;
    console.log("Update data keys:", Object.keys(updateData));
    console.log("Certificates count:", updateData.certifications?.length || 0);
    console.log("Badges count:", updateData.badges?.length || 0);
    console.log("Skills count:", updateData.skills?.length || 0);
    console.log("Full update data:", JSON.stringify(updateData, null, 2));

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!student) {
      console.error("❌ Student not found for ID:", req.user.id);
      return res.status(404).json({ message: "Student not found" });
    }

    console.log("✅ Student profile updated successfully");
    console.log(
      "Updated student certifications:",
      student.certifications?.length || 0
    );
    console.log("Updated student badges:", student.badges?.length || 0);

    res.json(student);
  } catch (error) {
    console.error("❌ Error updating student profile:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all students
export const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, program, yearLevel, skills } = req.query;
    const query = {};

    if (program) {
      query.program = program;
    }

    if (yearLevel) {
      query.yearLevel = yearLevel;
    }

    if (skills) {
      query.skills = { $in: skills.split(",") };
    }

    const students = await Student.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments(query);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get student by ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Search students
export const searchStudents = async (req, res) => {
  try {
    const { q, program, yearLevel, skills } = req.query;
    const query = {};

    if (q) {
      query.$or = [
        { program: { $regex: q, $options: "i" } },
        { skills: { $in: [new RegExp(q, "i")] } },
        { softSkills: { $in: [new RegExp(q, "i")] } },
        { certifications: { $in: [new RegExp(q, "i")] } },
      ];
    }

    if (program) {
      query.program = program;
    }

    if (yearLevel) {
      query.yearLevel = yearLevel;
    }

    if (skills) {
      query.skills = { $in: skills.split(",") };
    }

    const students = await Student.find(query)
      .limit(20)
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    console.error("Error searching students:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Endorse student
export const endorseStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const endorsement = {
      endorser: req.user._id,
      rating,
      comment,
      createdAt: new Date(),
    };

    student.endorsements.push(endorsement);
    await student.save();

    res.json({ message: "Student endorsed successfully" });
  } catch (error) {
    console.error("Error endorsing student:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update readiness checklist
export const updateReadinessChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { checklist } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.readinessChecklist = {
      ...student.readinessChecklist,
      ...checklist,
    };
    await student.save();

    res.json({ message: "Checklist updated successfully" });
  } catch (error) {
    console.error("Error updating checklist:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add badge
export const addBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const { badge } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.badges.includes(badge)) {
      student.badges.push(badge);
      await student.save();
    }

    res.json({ message: "Badge added successfully" });
  } catch (error) {
    console.error("Error adding badge:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove badge
export const removeBadge = async (req, res) => {
  try {
    const { id, badgeId } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.badges = student.badges.filter((badge) => badge !== badgeId);
    await student.save();

    res.json({ message: "Badge removed successfully" });
  } catch (error) {
    console.error("Error removing badge:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get companies interested in the student
export const getInterestedCompanies = async (req, res) => {
  try {
    console.log("🎯 Getting companies interested in student:", req.user.id);

    // Find all companies that have this student in their preferredApplicants
    const companies = await Company.find({
      "preferredApplicants.studentId": req.user.id,
    }).populate("preferredApplicants.studentId", "firstName lastName email");

    console.log(`Found ${companies.length} companies interested in student`);

    // Transform the data to match frontend expectations
    const interestedCompanies = companies.map((company) => {
      const studentApplication = company.preferredApplicants.find(
        (app) => app.studentId._id.toString() === req.user.id.toString()
      );

      return {
        id: company._id,
        companyName: company.companyName,
        industry: company.industry,
        companySize: company.companySize,
        location:
          company.address?.city || company.address?.state || "Not specified",
        website: company.website,
        logo: company.logoUrl || "",
        description: company.description || "",
        representative: {
          name: `${company.firstName} ${company.lastName}`,
          email: company.email,
          phone: company.phone || "Not provided",
        },
        internshipDetails: {
          positions: company.ojtSlots?.length || 0,
          duration: company.internshipDuration || 0,
          departments: company.departments || "Not specified",
          benefits: company.benefits || "Not specified",
        },
        skillsRequired: {
          mustHave: company.skillsMustHave || "",
          preferred: company.skillsPreferred || "",
          niceToHave: company.skillsNiceToHave || "",
        },
        socialMedia: {
          linkedin: company.linkedinUrl || "",
          facebook: company.facebookUrl || "",
          twitter: company.twitterUrl || "",
          instagram: company.instagramUrl || "",
        },
        status: "pending", // Default status for now
        interestedAt: studentApplication?.addedAt || company.createdAt,
        message:
          studentApplication?.notes ||
          "We're interested in your profile and would like to discuss internship opportunities with you.",
      };
    });

    console.log(
      "✅ Returning interested companies:",
      interestedCompanies.length
    );
    res.json({
      success: true,
      data: interestedCompanies,
    });
  } catch (error) {
    console.error("Error getting interested companies:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Accept company interest
export const acceptCompanyInterest = async (req, res) => {
  try {
    const { companyId } = req.params;
    const studentId = req.user.id;

    console.log(
      `🎯 Student ${studentId} accepting interest from company ${companyId}`
    );

    // For now, we'll just return success
    // In a real implementation, this would update the status in the database
    res.json({
      success: true,
      message: "Company interest accepted successfully",
    });
  } catch (error) {
    console.error("Error accepting company interest:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Decline company interest
export const declineCompanyInterest = async (req, res) => {
  try {
    const { companyId } = req.params;
    const studentId = req.user.id;

    console.log(
      `🎯 Student ${studentId} declining interest from company ${companyId}`
    );

    // For now, we'll just return success
    // In a real implementation, this would update the status in the database
    res.json({
      success: true,
      message: "Company interest declined successfully",
    });
  } catch (error) {
    console.error("Error declining company interest:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
