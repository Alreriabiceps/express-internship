import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "account_verified",
        "account_rejected",
        "endorsement_received",
        "badge_earned",
        "checklist_updated",
        "new_message",
        "application_received",
        "application_accepted",
        "application_rejected",
        "slot_posted",
        "system_announcement",
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    data: {
      // Additional data specific to notification type
      senderId: mongoose.Schema.Types.ObjectId,
      relatedId: mongoose.Schema.Types.ObjectId, // Could be studentId, companyId, etc.
      url: String, // Link to related page
      metadata: mongoose.Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    expiresAt: {
      type: Date,
      default: null, // Some notifications might expire
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });

export default mongoose.model("Notification", notificationSchema);






