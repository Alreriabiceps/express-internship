import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const companySchema = new mongoose.Schema(
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

    // Company representative information
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
    phone: {
      type: String,
      trim: true,
    },
    profilePicUrl: {
      type: String,
      default: null,
    },

    // Company information
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    industry: {
      type: String,
      required: [true, "Industry is required"],
      trim: true,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      required: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    location: {
      type: String,
      trim: true,
    },

    // Internship program information
    internPositions: {
      type: Number,
      min: [0, "Number of positions cannot be negative"],
    },
    internshipDuration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
    departments: {
      type: String,
      trim: true,
    },
    benefits: {
      type: String,
      maxlength: [500, "Benefits description cannot exceed 500 characters"],
    },

    // Skill requirements
    skillsMustHave: {
      type: String,
      trim: true,
    },
    skillsPreferred: {
      type: String,
      trim: true,
    },
    skillsNiceToHave: {
      type: String,
      trim: true,
    },

    // Social media links
    linkedinUrl: {
      type: String,
      trim: true,
    },
    facebookUrl: {
      type: String,
      trim: true,
    },
    twitterUrl: {
      type: String,
      trim: true,
    },
    instagramUrl: {
      type: String,
      trim: true,
    },

    // Address information
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      province: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
    },

    // Contact person information
    contactPerson: {
      name: {
        type: String,
        trim: true,
      },
      position: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },

    // OJT slots/job postings
    ojtSlots: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
          maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        department: {
          type: String,
          required: true,
          trim: true,
        },
        duration: {
          type: Number,
          required: true,
          min: [1, "Duration must be at least 1 month"],
        },
        allowance: {
          type: Number,
          default: 0,
        },
        workType: {
          type: String,
          enum: ["Remote", "On-site", "Hybrid"],
          required: true,
        },
        skillRequirements: {
          mustHave: [
            {
              type: String,
              trim: true,
            },
          ],
          preferred: [
            {
              type: String,
              trim: true,
            },
          ],
          niceToHave: [
            {
              type: String,
              trim: true,
            },
          ],
        },
        requirements: [
          {
            type: String,
            trim: true,
          },
        ],
        benefits: [
          {
            type: String,
            trim: true,
          },
        ],
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        location: {
          type: String,
          trim: true,
        },
        positions: {
          type: Number,
          default: 1,
          min: [1, "At least 1 position is required"],
        },
        responsibilities: [
          {
            type: String,
            trim: true,
          },
        ],
        qualifications: [
          {
            type: String,
            trim: true,
          },
        ],
        applicationDeadline: {
          type: Date,
        },
        status: {
          type: String,
          enum: ["open", "closed", "filled"],
          default: "open",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        maxApplicants: {
          type: Number,
          default: 10,
        },
        currentApplicants: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        applicants: [
          {
            studentId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Student",
            },
            appliedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
    ],

    // Preferred applicants
    preferredApplicants: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        notes: {
          type: String,
          trim: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Company rating
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },

    // Verification status
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
companySchema.index({
  companyName: "text",
  industry: "text",
  description: "text",
  "address.city": "text",
  "ojtSlots.title": "text",
});

// Hash password before saving
companySchema.pre("save", async function (next) {
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
companySchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name
companySchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Remove password from JSON output
companySchema.methods.toJSON = function () {
  const companyObject = this.toObject();
  delete companyObject.password;
  return companyObject;
};

export default mongoose.model("Company", companySchema);
