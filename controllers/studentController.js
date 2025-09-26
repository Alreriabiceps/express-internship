import User from "../models/User.js";
import Student from "../models/Student.js";

// Get student profile
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate(
      "userId"
    );

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
    const updateData = req.body;

    const student = await Student.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    ).populate("userId");

    res.json(student);
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ message: "Server error" });
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
      .populate("user", "firstName lastName email phone profilePictureUrl")
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
    const student = await Student.findById(id).populate("user");

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
      .populate("user", "firstName lastName email phone profilePictureUrl")
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
