import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
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
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
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
      required: [true, "Company description is required"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
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
      },
    ],
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

export default mongoose.model("Company", companySchema);
