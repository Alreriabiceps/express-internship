import mongoose from "mongoose";

const evaluationQuestionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: [true, "Question prompt is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const evaluationSectionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Section label is required"],
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, "Section title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    questions: {
      type: [evaluationQuestionSchema],
      validate: {
        validator: (value) => value && value.length > 0,
        message: "At least one question is required per section",
      },
    },
  },
  { _id: false }
);

const ratingScaleSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      default: 1,
    },
    max: {
      type: Number,
      default: 5,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const evaluationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    course: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sections: {
      type: [evaluationSectionSchema],
      validate: {
        validator: (value) => value && value.length > 0,
        message: "At least one section is required",
      },
    },
    ratingScale: {
      type: ratingScaleSchema,
      default: {
        min: 1,
        max: 5,
        labels: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
        description:
          "Rating: 5 – Excellent, 4 – Very Good, 3 – Good, 2 – Fair, 1 – Poor",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

evaluationTemplateSchema.index({ name: "text", course: "text" });

export default mongoose.model(
  "EvaluationTemplate",
  evaluationTemplateSchema
);


