import mongoose from "mongoose";
import User from "./models/User.js";
import Student from "./models/Student.js";
import Company from "./models/Company.js";

async function checkData() {
  try {
    await mongoose.connect("mongodb://localhost:27017/internship-platform");
    console.log("Connected to MongoDB");

    const users = await User.countDocuments();
    const students = await Student.countDocuments();
    const companies = await Company.countDocuments();

    console.log("Current data:");
    console.log("Users:", users);
    console.log("Students:", students);
    console.log("Companies:", companies);

    // Check some specific data
    const verifiedCompanies = await Company.countDocuments({
      isVerified: true,
    });
    const internshipReadyStudents = await Student.countDocuments({
      isInternshipReady: true,
    });

    console.log("Verified Companies:", verifiedCompanies);
    console.log("Internship Ready Students:", internshipReadyStudents);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
  }
}

checkData();
