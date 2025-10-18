import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/internship-portal"
    );
    console.log("✅ Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("⚠️  Admin account already exists:");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(
        `   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`
      );
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log(`   Verified: ${existingAdmin.verified}`);

      const shouldOverwrite = process.argv.includes("--overwrite");
      if (!shouldOverwrite) {
        console.log(
          "\n💡 To overwrite existing admin, run: node create-admin.js --overwrite"
        );
        await mongoose.disconnect();
        return;
      }

      console.log("🔄 Overwriting existing admin account...");
      await User.findByIdAndDelete(existingAdmin._id);
    }

    // Create admin account
    const adminData = {
      email: "admin@internship-portal.com",
      password: "Admin123!",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      verified: true,
      isActive: true,
      phone: "+1-555-0123",
    };

    console.log("🔧 Creating admin account...");
    const admin = await User.create(adminData);

    console.log("✅ Admin account created successfully!");
    console.log("📋 Admin Details:");
    console.log(`   ID: ${admin._id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminData.password}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Verified: ${admin.verified}`);
    console.log(`   Active: ${admin.isActive}`);
    console.log(`   Created: ${admin.createdAt}`);

    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${adminData.password}`);

    console.log("\n🌐 You can now login at:");
    console.log("   Frontend: http://localhost:5173/admin/login");
    console.log("   Or use the API: POST /api/auth/login");
  } catch (error) {
    console.error("❌ Error creating admin account:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

createAdmin();
