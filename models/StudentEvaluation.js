import mongoose from "mongoose";

const evaluationQuestionResponseSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    comments: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const evaluationSectionResponseSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    questions: {
      type: [evaluationQuestionResponseSchema],
      default: [],
    },
  },
  { _id: false }
);

const studentEvaluationSchema = new mongoose.Schema(
  {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EvaluationTemplate",
      required: true,
    },
    templateSnapshot: {
      name: {
        type: String,
        required: true,
      },
      sections: {
        type: [evaluationSectionResponseSchema],
        default: [],
      },
      ratingScale: {
        min: Number,
        max: Number,
        labels: [String],
        description: String,
      },
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    studentInfo: {
      fullName: String,
      program: String,
      course: String,
      studentNumber: String,
      email: String,
    },
    companyInfo: {
      name: String,
      representative: String,
      email: String,
    },
    trainingPeriod: {
      from: Date,
      to: Date,
    },
    internshipAssignment: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted"],
      default: "pending",
    },
    dueDate: {
      type: Date,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    sections: {
      type: [evaluationSectionResponseSchema],
      default: [],
    },
    overallComments: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
  },
  {
    timestamps: true,
  }
);

studentEvaluationSchema.index({ student: 1, company: 1, template: 1 });
studentEvaluationSchema.index({ company: 1, status: 1 });

export default mongoose.model("StudentEvaluation", studentEvaluationSchema);


