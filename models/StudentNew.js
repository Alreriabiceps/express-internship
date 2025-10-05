import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const studentSchema = new mongoose.Schema(
  {
    // Authentication fields
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // Personal information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    age: {
      type: Number,
      min: [16, "Age must be at least 16"],
      max: [100, "Age must be at most 100"],
    },
    sex: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    phone: {
      type: String,
      trim: true,
    },
    profilePicUrl: {
      type: String,
      default: null,
    },

    // Academic information
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

    // Skills and competencies
    skills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        level: {
          type: Number,
          min: 1,
          max: 5,
          default: 1,
        },
      },
    ],
    softSkills: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        level: {
          type: Number,
          min: 1,
          max: 5,
          default: 1,
        },
      },
    ],

    // Certifications
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

    // Internship preferences
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

    // Readiness checklist
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

    // Endorsements
    endorsements: [
      {
        endorsedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Company",
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

    // Badges and achievements
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

    // Portfolio links
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

    // Availability
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
  "softSkills.name": "text",
  program: "text",
  "preferredFields.location": "text",
  firstName: "text",
  lastName: "text",
});

// Hash password before saving
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
studentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Remove password from JSON output
studentSchema.methods.toJSON = function () {
  const studentObject = this.toObject();
  delete studentObject.password;
  return studentObject;
};

export default mongoose.model("StudentNew", studentSchema);
