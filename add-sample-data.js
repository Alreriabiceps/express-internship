import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Company from "./models/Company.js";
import bcrypt from "bcryptjs";

async function addMoreSampleData() {
  try {
    await mongoose.connect("mongodb://localhost:27017/internship-platform");
    console.log("Connected to MongoDB");

    // Check existing data
    const existingUsers = await User.countDocuments();
    const existingStudents = await Student.countDocuments();
    const existingCompanies = await Company.countDocuments();
    
    console.log(`Existing: ${existingUsers} users, ${existingStudents} students, ${existingCompanies} companies`);

    // Create sample students (only if we don't have enough)
    if (existingStudents < 20) {
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

      for (let i = existingStudents + 1; i <= 20; i++) {
        try {
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
            isProfileHidden: Math.random() > 0.8,
            skills: [
              { name: "JavaScript", level: "Intermediate" },
              { name: "React", level: "Beginner" },
              { name: "Node.js", level: "Advanced" }
            ].slice(0, Math.floor(Math.random() * 3) + 1),
            certifications: Math.random() > 0.6 ? [
              { name: "AWS Certified", issuer: "Amazon", date: new Date() },
              { name: "Google Cloud", issuer: "Google", date: new Date() }
            ] : [],
            badges: Math.random() > 0.7 ? [
              { name: "Top Performer", description: "Excellent work", date: new Date() },
              { name: "Team Player", description: "Great collaboration", date: new Date() }
            ] : []
          });
          await student.save();
          console.log(`Created student ${i}`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`Student ${i} already exists, skipping...`);
          } else {
            console.error(`Error creating student ${i}:`, error.message);
          }
        }
      }
    }

    // Create sample companies (only if we don't have enough)
    if (existingCompanies < 15) {
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

      for (let i = existingCompanies + 1; i <= 15; i++) {
        try {
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
            isProfileHidden: Math.random() > 0.9,
            ojtSlots: Math.random() > 0.5 ? [
              { position: "Frontend Developer", description: "React development", requirements: ["JavaScript", "React"] },
              { position: "Backend Developer", description: "Node.js development", requirements: ["Node.js", "MongoDB"] }
            ] : [],
            preferredApplicants: Math.random() > 0.7 ? [`Student1`, `Student5`] : []
          });
          await company.save();
          console.log(`Created company ${i}`);
        } catch (error) {
          if (error.code === 11000) {
            console.log(`Company ${i} already exists, skipping...`);
          } else {
            console.error(`Error creating company ${i}:`, error.message);
          }
        }
      }
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

addMoreSampleData();
