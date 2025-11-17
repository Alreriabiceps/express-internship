import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import mongoose from "mongoose";

// Get conversations for a user
export const getConversations = async (req, res) => {
  try {
    const userIdRaw = req.user?._id || req.user?.id;
    const userId = new mongoose.Types.ObjectId(userIdRaw);
    console.log("Getting conversations for user:", userIdRaw);

    // Get all conversations where user is either fromUser or toUser
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [{ fromUser: userId }, { toUser: userId }],
          isDeleted: false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$fromUser", userId] }, "$toUser", "$fromUser"],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$toUser", userId] },
                    { $eq: ["$readAt", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userParticipant",
        },
      },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "companyParticipant",
        },
      },
      {
        $addFields: {
          participant: {
            $cond: {
              if: { $gt: [{ $size: "$userParticipant" }, 0] },
              then: { $arrayElemAt: ["$userParticipant", 0] },
              else: { $arrayElemAt: ["$companyParticipant", 0] },
            },
          },
        },
      },
      {
        $unwind: "$participant",
      },
      {
        $project: {
          _id: 1,
          participants: [
            {
              _id: "$participant._id",
              firstName: "$participant.firstName",
              lastName: "$participant.lastName",
              email: "$participant.email",
              profilePictureUrl: "$participant.profilePictureUrl",
              role: "$participant.role",
              // Company specific fields
              companyName: "$participant.companyName",
              logoUrl: "$participant.logoUrl",
              industry: "$participant.industry",
            },
          ],
          lastMessage: {
            _id: "$lastMessage._id",
            message: "$lastMessage.message",
            type: "$lastMessage.type",
            createdAt: "$lastMessage.createdAt",
            readAt: "$lastMessage.readAt",
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    console.log("Found conversations:", conversations.length);
    console.log("Conversations:", conversations);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?._id || req.user?.id;

    const messages = await ChatMessage.find({
      $or: [
        { fromUser: currentUserId, toUser: userId },
        { fromUser: userId, toUser: currentUserId },
      ],
      isDeleted: false,
    })
      .populate("fromUser", "firstName lastName profilePicUrl")
      .populate("toUser", "firstName lastName profilePicUrl")
      .sort({ createdAt: 1 });

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        fromUser: userId,
        toUser: currentUserId,
        readAt: null,
      },
      { readAt: new Date() }
    );

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, type = "text", attachments } = req.body;
    const senderId = req.user?._id || req.user?.id;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Prevent sending message to self
    if (senderId.toString() === receiverId) {
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });
    }

    const chatMessage = new ChatMessage({
      fromUser: senderId,
      toUser: receiverId,
      message,
      messageType: type,
      attachment: attachments,
    });

    await chatMessage.save();

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate("fromUser", "firstName lastName profilePicUrl")
      .populate("toUser", "firstName lastName profilePicUrl");

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark message as read
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the receiver
    if (
      message.toUser.toString() !== (req.user?._id || req.user?.id).toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    message.readAt = new Date();
    await message.save();

    res.json({ message: "Message marked as read" });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the sender
    if (
      message.fromUser.toString() !== (req.user?._id || req.user?.id).toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const unreadCount = await ChatMessage.countDocuments({
      toUser: userId,
      readAt: null,
      isDeleted: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new conversation (or get existing one)
export const createConversation = async (req, res) => {
  try {
    console.log("=== CREATE CONVERSATION CALLED ===");
    console.log("Request body:", req.body);
    console.log("User from token:", req.user);

    const { otherUserId } = req.body;
    const currentUserId = req.user?._id || req.user?.id;
    console.log(
      "Creating conversation between:",
      currentUserId,
      "and",
      otherUserId
    );

    // Check if other user exists (could be in User or Company collection)
    let otherUser = await User.findById(otherUserId);
    let otherUserType = "user";

    if (!otherUser) {
      otherUser = await Company.findById(otherUserId);
      otherUserType = "company";
    }

    console.log(
      "Other user found:",
      otherUser ? `${otherUser.email} (${otherUserType})` : "NOT FOUND"
    );
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent creating conversation with self
    if (currentUserId.toString() === otherUserId) {
      return res
        .status(400)
        .json({ message: "Cannot create conversation with yourself" });
    }

    // Check if conversation already exists
    const existingConversation = await ChatMessage.findOne({
      $or: [
        { fromUser: currentUserId, toUser: otherUserId },
        { fromUser: otherUserId, toUser: currentUserId },
      ],
      isDeleted: false,
    });

    console.log(
      "Existing conversation found:",
      existingConversation ? "YES" : "NO"
    );
    if (existingConversation) {
      return res.json({
        message: "Conversation already exists",
        conversationId: existingConversation._id,
      });
    }

    // Create a welcome message to establish the conversation
    console.log("Creating welcome message...");
    const welcomeMessage = new ChatMessage({
      fromUser: currentUserId,
      toUser: otherUserId,
      message: "Hello! I'd like to connect with you.",
      messageType: "text",
    });

    await welcomeMessage.save();
    console.log("Welcome message saved:", welcomeMessage._id);

    res.status(201).json({
      message: "Conversation created",
      conversationId: welcomeMessage._id,
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ message: "Server error" });
  }
};
