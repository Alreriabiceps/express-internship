import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Import models
import User from "./models/User.js";
import Student from "./models/Student.js";
import Company from "./models/Company.js";

dotenv.config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/internship-portal"
    );
    console.log("Connected to MongoDB");

    // Clear existing test users
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    console.log("Cleared existing test users");

    // Create test admin
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@test.com",
      password: adminPassword,
      role: "admin",
      verified: true,
      isActive: true,
    });
    console.log("✅ Created admin user: admin@test.com / admin123");

    // Create test student
    const studentPassword = await bcrypt.hash("student123", 10);
    const student = await User.create({
      firstName: "John",
      lastName: "Doe",
      email: "student@test.com",
      password: studentPassword,
      role: "student",
      verified: true,
      isActive: true,
    });

    await Student.create({
      userId: student._id,
      program: "Computer Science",
      yearLevel: "3rd Year",
      studentId: "CS2024001",
      skills: [
        { name: "JavaScript", level: "Intermediate" },
        { name: "React", level: "Intermediate" },
        { name: "Node.js", level: "Beginner" },
      ],
      softSkills: ["Communication", "Teamwork"],
      readinessChecklist: [
        { requirement: "Resume Updated", completed: true },
        { requirement: "Portfolio Ready", completed: true },
        { requirement: "LinkedIn Optimized", completed: true },
        { requirement: "Skills Assessed", completed: true },
        { requirement: "Goals Defined", completed: true },
      ],
    });
    console.log("✅ Created student user: student@test.com / student123");

    // Create test company
    const companyPassword = await bcrypt.hash("company123", 10);
    const company = await User.create({
      firstName: "Jane",
      lastName: "Smith",
      email: "company@test.com",
      password: companyPassword,
      role: "company",
      verified: true,
      isActive: true,
    });

    await Company.create({
      user: company._id,
      companyName: "Tech Solutions Inc.",
      industry: "Technology",
      companySize: "50-100",
      website: "https://techsolutions.com",
      description: "Leading technology company providing innovative solutions",
      ojtSlots: 5,
      preferredApplicants: ["Computer Science", "Information Technology"],
    });
    console.log("✅ Created company user: company@test.com / company123");

    console.log("\n🎉 Test users created successfully!");
    console.log("\n📋 Test Credentials:");
    console.log("👨‍💼 Admin: admin@test.com / admin123");
    console.log("🎓 Student: student@test.com / student123");
    console.log("🏢 Company: company@test.com / company123");
  } catch (error) {
    console.error("Error creating test users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

createTestUsers();
