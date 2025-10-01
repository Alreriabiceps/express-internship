import express from "express";
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount,
} from "../controllers/chatController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.get("/conversations", getConversations);
router.get("/messages/:userId", getMessages);
router.post("/send", sendMessage);
router.put("/messages/:messageId/read", markAsRead);
router.delete("/messages/:messageId", deleteMessage);
router.get("/unread-count", getUnreadCount);

export default router;






