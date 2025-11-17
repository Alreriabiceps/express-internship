import express from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount,
  createConversation,
} from "../controllers/chatController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Test route to verify chat routes are loaded
router.get("/test", (req, res) => {
  res.json({ message: "Chat routes are working!" });
});

// All routes require authentication
router.use(verifyToken);

// Routes
router.get("/conversations", getConversations);
router.get("/messages/:userId", getMessages);
router.post("/send", sendMessage);
router.post("/conversations", createConversation);
router.put("/messages/:messageId/read", markAsRead);
router.delete("/messages/:messageId", deleteMessage);
router.get("/unread-count", getUnreadCount);

export default router;
