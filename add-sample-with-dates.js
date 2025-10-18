import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Company from "./models/Company.js";
import bcrypt from "bcryptjs";

async function addSampleDataWithDates() {
  try {
    await mongoose.connect("mongodb://localhost:27017/internship-platform");
    console.log("Connected to MongoDB");

    // Clear existing sample data (keep admin)
    await Student.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({ role: { $in: ["student", "company"] } });
    console.log("Cleared existing sample data");

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

    // Create students with different creation dates
    for (let i = 1; i <= 10; i++) {
      const daysAgo = Math.floor(Math.random() * 90); // Random date within last 90 days
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const studentUser = new User({
        email: `student${i}@test.com`,
        password: await bcrypt.hash("student123", 10),
        role: "student",
        firstName: `Student${i}`,
        lastName: `Last${i}`,
        createdAt: createdAt,
      });
      await studentUser.save();

      const student = new Student({
        userId: studentUser._id,
        firstName: `Student${i}`,
        lastName: `Last${i}`,
        studentId: `STU${i.toString().padStart(3, "0")}`,
        email: `student${i}@test.com`,
        password: await bcrypt.hash("student123", 10),
        program: programs[Math.floor(Math.random() * programs.length)],
        yearLevel: yearLevels[Math.floor(Math.random() * yearLevels.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isInternshipReady: Math.random() > 0.5,
        isProfileHidden: Math.random() > 0.8,
        createdAt: createdAt,
      });
      await student.save();
      console.log(`Created student ${i} with date ${createdAt.toISOString()}`);
    }

    // Create companies with different creation dates
    for (let i = 1; i <= 8; i++) {
      const daysAgo = Math.floor(Math.random() * 60); // Random date within last 60 days
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const companyUser = new User({
        email: `company${i}@test.com`,
        password: await bcrypt.hash("company123", 10),
        role: "company",
        firstName: `Company${i}`,
        lastName: `Corp`,
        createdAt: createdAt,
      });
      await companyUser.save();

      const company = new Company({
        userId: companyUser._id,
        companyName: `Company ${i}`,
        email: `company${i}@test.com`,
        password: await bcrypt.hash("company123", 10),
        firstName: `Company${i}`,
        lastName: `Corp`,
        industry: industries[Math.floor(Math.random() * industries.length)],
        companySize:
          companySizes[Math.floor(Math.random() * companySizes.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isVerified: Math.random() > 0.3,
        verificationStatus: Math.random() > 0.3 ? "approved" : "pending",
        isProfileHidden: Math.random() > 0.9,
        createdAt: createdAt,
      });
      await company.save();
      console.log(`Created company ${i} with date ${createdAt.toISOString()}`);
    }

    // Final count
    const finalUsers = await User.countDocuments();
    const finalStudents = await Student.countDocuments();
    const finalCompanies = await Company.countDocuments();

    console.log(
      `Final count: ${finalUsers} users, ${finalStudents} students, ${finalCompanies} companies`
    );

    await mongoose.disconnect();
    console.log("Sample data with dates created successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

addSampleDataWithDates();
