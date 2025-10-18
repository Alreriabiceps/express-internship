import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Company from "./models/Company.js";
import bcrypt from "bcryptjs";

async function createSimpleSampleData() {
  try {
    await mongoose.connect("mongodb://localhost:27017/internship-platform");
    console.log("Connected to MongoDB");

    // Clear existing data first
    await Student.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({ role: { $in: ['student', 'company'] } });
    console.log("Cleared existing sample data");

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
        studentId: `STU${i.toString().padStart(3, '0')}`,
        email: `student${i}@test.com`,
        password: await bcrypt.hash("student123", 10),
        program: programs[Math.floor(Math.random() * programs.length)],
        yearLevel: yearLevels[Math.floor(Math.random() * yearLevels.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isInternshipReady: Math.random() > 0.5,
        isProfileHidden: Math.random() > 0.8
      });
      await student.save();
      console.log(`Created student ${i}`);
    }

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
        companySize: companySizes[Math.floor(Math.random() * companySizes.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        isVerified: Math.random() > 0.3,
        verificationStatus: Math.random() > 0.3 ? "approved" : "pending",
        isProfileHidden: Math.random() > 0.9
      });
      await company.save();
      console.log(`Created company ${i}`);
    }

    // Final count
    const finalUsers = await User.countDocuments();
    const finalStudents = await Student.countDocuments();
    const finalCompanies = await Company.countDocuments();
    
    console.log(`Final count: ${finalUsers} users, ${finalStudents} students, ${finalCompanies} companies`);

    await mongoose.disconnect();
    console.log("Sample data creation completed!");
  } catch (error) {
    console.error("Error:", error);
  }
}

createSimpleSampleData();
