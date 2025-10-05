import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const checkUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/internship-portal"
    );
    console.log("Connected to MongoDB");

    // Find all users
    const users = await User.find({});
    console.log("All users in database:");
    users.forEach((user) => {
      console.log(`- ${user.email} (${user.role}) - Active: ${user.isActive}`);
    });

    // Check for admin users
    const admins = await User.find({ role: "admin" });
    console.log(`\nFound ${admins.length} admin users:`);
    admins.forEach((admin) => {
      console.log(`- Email: ${admin.email}`);
      console.log(`- Role: ${admin.role}`);
      console.log(`- Active: ${admin.isActive}`);
      console.log(`- Verified: ${admin.verified}`);
      console.log(`- Has password: ${admin.password ? "Yes" : "No"}`);
    });
  } catch (error) {
    console.error("Error checking users:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

checkUsers();
