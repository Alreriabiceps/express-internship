import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    program: {
      type: String,
      required: [true, "Program is required"],
      trim: true,
    },
    yearLevel: {
      type: String,
      required: [true, "Year level is required"],
      enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"],
    },
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      unique: true,
      trim: true,
    },
    skills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        level: {
          type: String,
          enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
          default: "Beginner",
        },
      },
    ],
    softSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    certifications: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        issuer: {
          type: String,
          required: true,
          trim: true,
        },
        dateIssued: {
          type: Date,
          required: true,
        },
        certificateUrl: {
          type: String,
          required: true,
        },
        verificationUrl: {
          type: String,
        },
        imageUrl: {
          type: String,
        },
      },
    ],
    preferredFields: {
      allowance: {
        min: {
          type: Number,
          default: 0,
        },
        max: {
          type: Number,
          default: 50000,
        },
      },
      location: [
        {
          type: String,
          trim: true,
        },
      ],
      role: [
        {
          type: String,
          trim: true,
        },
      ],
      workType: {
        type: String,
        enum: ["Remote", "On-site", "Hybrid"],
        default: "On-site",
      },
    },
    readinessChecklist: [
      {
        requirement: {
          type: String,
          required: true,
          trim: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],
    endorsements: [
      {
        endorsedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        skill: {
          type: String,
          required: true,
          trim: true,
        },
        message: {
          type: String,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    badges: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        iconUrl: {
          type: String,
          required: true,
        },
        externalUrl: {
          type: String,
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
        imageUrl: {
          type: String,
        },
      },
    ],
    resumeUrl: {
      type: String,
    },
    portfolioUrl: {
      type: String,
    },
    linkedinUrl: {
      type: String,
    },
    githubUrl: {
      type: String,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    availabilityDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
studentSchema.index({
  "skills.name": "text",
  softSkills: "text",
  program: "text",
  "preferredFields.location": "text",
});

export default mongoose.model("Student", studentSchema);
