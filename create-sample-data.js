import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Company from "./models/Company.js";
import bcrypt from "bcryptjs";

async function createSampleData() {
  try {
    await mongoose.connect("mongodb://localhost:27017/internship-platform");
    console.log("Connected to MongoDB");

    // Create admin user
    const adminUser = new User({
      email: "admin@test.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
      firstName: "Admin",
      lastName: "User"
    });
    await adminUser.save();
    console.log("Created admin user");

    // Create sample students
    const programs = [
      "Information System",
      "Business Administration",
      "Criminal Justice",
      "Education",
      "Maritime",
      "Nursing",
      "Tourism",
    ];
    const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const addresses = [
      "Manila",
      "Quezon City",
      "Makati",
      "Taguig",
      "Pasig",
      "Mandaluyong",
      "San Juan",
    ];

    for (let i = 1; i <= 20; i++) {
      const studentUser = new User({
        email: `student${i}@test.com`,
        password: await bcrypt.hash("student123", 10),
        role: "student",
        firstName: `Student${i}`,
        lastName: `Last${i}`
      });
      await studentUser.save();

      const student = new Student({
        userId: studentUser._id,
        firstName: `Student${i}`,
        lastName: `Last${i}`,
        program: programs[Math.floor(Math.random() * programs.length)],
        yearLevel: yearLevels[Math.floor(Math.random() * yearLevels.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isInternshipReady: Math.random() > 0.5,
        isProfileHidden: Math.random() > 0.8,
        skills: ["JavaScript", "React", "Node.js", "MongoDB"].slice(
          0,
          Math.floor(Math.random() * 4) + 1
        ),
        certifications:
          Math.random() > 0.6 ? ["AWS Certified", "Google Cloud"] : [],
        badges: Math.random() > 0.7 ? ["Top Performer", "Team Player"] : [],
      });
      await student.save();
    }
    console.log("Created 20 sample students");

    // Create sample companies
    const industries = [
      "Technology",
      "Healthcare",
      "Finance",
      "Education",
      "Manufacturing",
      "Retail",
      "Consulting",
    ];
    const companySizes = [
      "1-10",
      "11-50",
      "51-200",
      "201-500",
      "501-1000",
      "1000+",
    ];

    for (let i = 1; i <= 15; i++) {
      const companyUser = new User({
        email: `company${i}@test.com`,
        password: await bcrypt.hash("company123", 10),
        role: "company",
        firstName: `Company${i}`,
        lastName: `Corp`
      });
      await companyUser.save();

      const company = new Company({
        userId: companyUser._id,
        companyName: `Company ${i}`,
        industry: industries[Math.floor(Math.random() * industries.length)],
        companySize:
          companySizes[Math.floor(Math.random() * companySizes.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isVerified: Math.random() > 0.3,
        verificationStatus: Math.random() > 0.3 ? "approved" : "pending",
        isProfileHidden: Math.random() > 0.9,
        ojtSlots:
          Math.random() > 0.5
            ? ["Frontend Developer", "Backend Developer"]
            : [],
        preferredApplicants:
          Math.random() > 0.7 ? ["Student1", "Student5"] : [],
      });
      await company.save();
    }
    console.log("Created 15 sample companies");

    await mongoose.disconnect();
    console.log("Sample data created successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

createSampleData();
