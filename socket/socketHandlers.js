import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ChatMessage from "../models/ChatMessage.js";
import Notification from "../models/Notification.js";

export const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user || !user.isActive) {
        return next(new Error("Authentication error: Invalid user"));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `User ${socket.user.email} connected with socket ID: ${socket.id}`
    );

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining conversation rooms
    socket.on("join_conversation", (data) => {
      const { otherUserId } = data;
      const roomId = [socket.userId, otherUserId].sort().join("_");
      socket.join(roomId);
      console.log(
        `User ${socket.user.email} joined conversation room: ${roomId}`
      );
    });

    // Handle leaving conversation rooms
    socket.on("leave_conversation", (data) => {
      const { otherUserId } = data;
      const roomId = [socket.userId, otherUserId].sort().join("_");
      socket.leave(roomId);
      console.log(
        `User ${socket.user.email} left conversation room: ${roomId}`
      );
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { toUserId, message, messageType = "text", attachment } = data;

        // Validate message
        if (!message || message.trim().length === 0) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        // Create message in database
        const chatMessage = await ChatMessage.create({
          fromUser: socket.userId,
          toUser: toUserId,
          message: message.trim(),
          messageType,
          attachment,
        });

        // Populate sender info
        await chatMessage.populate(
          "fromUser",
          "firstName lastName email profilePicUrl"
        );

        // Send message to conversation room
        const roomId = [socket.userId, toUserId].sort().join("_");
        io.to(roomId).emit("new_message", {
          message: chatMessage,
          conversationId: roomId,
        });

        // Send notification to recipient if they're not in the conversation
        const recipientSocket = await findUserSocket(toUserId);
        if (!recipientSocket) {
          await Notification.create({
            userId: toUserId,
            type: "new_message",
            title: "New Message",
            message: `You have a new message from ${socket.user.firstName} ${socket.user.lastName}`,
            data: {
              senderId: socket.userId,
              messageId: chatMessage._id,
            },
            priority: "medium",
          });

          // Emit notification to recipient's personal room
          io.to(`user_${toUserId}`).emit("new_notification", {
            type: "new_message",
            title: "New Message",
            message: `You have a new message from ${socket.user.firstName} ${socket.user.lastName}`,
          });
        }

        socket.emit("message_sent", { messageId: chatMessage._id });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { toUserId } = data;
      const roomId = [socket.userId, toUserId].sort().join("_");
      socket.to(roomId).emit("user_typing", {
        userId: socket.userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        isTyping: true,
      });
    });

    socket.on("typing_stop", (data) => {
      const { toUserId } = data;
      const roomId = [socket.userId, toUserId].sort().join("_");
      socket.to(roomId).emit("user_typing", {
        userId: socket.userId,
        userName: `${socket.user.firstName} ${socket.user.lastName}`,
        isTyping: false,
      });
    });

    // Handle message read status
    socket.on("mark_messages_read", async (data) => {
      try {
        const { fromUserId } = data;

        await ChatMessage.updateMany(
          { fromUser: fromUserId, toUser: socket.userId, isRead: false },
          { isRead: true, readAt: new Date() }
        );

        // Notify sender that messages were read
        io.to(`user_${fromUserId}`).emit("messages_read", {
          readBy: socket.userId,
          readAt: new Date(),
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle user status updates
    socket.on("update_status", (data) => {
      const { status } = data;
      socket.broadcast.emit("user_status_update", {
        userId: socket.userId,
        status,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${socket.user.email} disconnected`);

      // Notify other users that this user went offline
      socket.broadcast.emit("user_offline", {
        userId: socket.userId,
      });
    });
  });

  // Helper function to find user's socket
  const findUserSocket = async (userId) => {
    const sockets = await io.fetchSockets();
    return sockets.find((socket) => socket.userId === userId.toString());
  };
};






