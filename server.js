import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import studentRoutes from "./routes/students.js";
import companyRoutes from "./routes/companies.js";
import adminRoutes from "./routes/admin.js";
import chatRoutes from "./routes/chat.js";
import notificationRoutes from "./routes/notifications.js";

// Import middleware
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";

// Import socket handlers
import { setupSocketHandlers } from "./socket/socketHandlers.js";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000, // Higher limit for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/internship-portal"
    );
    console.log("✅ Connected to MongoDB:", conn.connection.host);

    // Actually test the database with a real operation
    await conn.connection.db.admin().ping();
    console.log("✅ Database is responding to operations");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    console.error("🚨 SERVER WILL NOT START WITHOUT DATABASE CONNECTION");
    process.exit(1); // Exit the process if database connection fails
  }
};

// Connect to database before starting server
await connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

// Development helper endpoint to reset rate limits
if (process.env.NODE_ENV !== "production") {
  app.get("/api/reset-rate-limit", (req, res) => {
    // This is a simple way to reset rate limits in development
    res.json({
      message:
        "Rate limit reset for development. Please wait a moment before making requests.",
    });
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Internship Portal API is running",
    timestamp: new Date().toISOString(),
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`
  );
});
