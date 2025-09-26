import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";

// Get conversations for a user
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all conversations where user is either sender or receiver
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
          isDeleted: false,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", userId] },
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
          as: "participant",
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
    const currentUserId = req.user._id;

    const messages = await ChatMessage.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
      isDeleted: false,
    })
      .populate("sender", "firstName lastName profilePictureUrl")
      .populate("receiver", "firstName lastName profilePictureUrl")
      .sort({ createdAt: 1 });

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
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
    const senderId = req.user._id;

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
      sender: senderId,
      receiver: receiverId,
      message,
      type,
      attachments,
    });

    await chatMessage.save();

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate("sender", "firstName lastName profilePictureUrl")
      .populate("receiver", "firstName lastName profilePictureUrl");

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
    if (message.receiver.toString() !== req.user._id.toString()) {
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
    if (message.sender.toString() !== req.user._id.toString()) {
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
    const userId = req.user._id;

    const unreadCount = await ChatMessage.countDocuments({
      receiver: userId,
      readAt: null,
      isDeleted: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Server error" });
  }
};
