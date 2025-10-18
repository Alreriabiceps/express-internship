import mongoose from "mongoose";
import Student from "./models/Student.js";
import Company from "./models/Company.js";

async function testEngagementQuery() {
  try {
    await mongoose.connect("mongodb://localhost:27017/internship-platform");
    console.log("Connected to MongoDB");

    // Test the engagement query
    const engagementStats = await Promise.all([
      // Students with any profile data
      Student.countDocuments({
        $or: [
          { skills: { $exists: true, $ne: [] } },
          { certifications: { $exists: true, $ne: [] } },
          { badges: { $exists: true, $ne: [] } },
        ],
      }),
      // Companies with any profile data
      Company.countDocuments({
        $or: [
          { ojtSlots: { $exists: true, $ne: [] } },
          { preferredApplicants: { $exists: true, $ne: [] } },
        ],
      }),
    ]);

    console.log("Engagement stats:", engagementStats);

    await mongoose.disconnect();
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

testEngagementQuery();
