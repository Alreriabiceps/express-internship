import mongoose from "mongoose";

// Middleware to check if database is actually working (not just connected)
export const checkDatabaseConnection = async (req, res, next) => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database connection not available. Please try again later.",
        error: "DATABASE_DISCONNECTED",
      });
    }

    // Actually test the database with a real operation
    // This will fail if MongoDB is not actually running
    await mongoose.connection.db.admin().ping();

    next();
  } catch (error) {
    console.error("Database connection test failed:", error);
    return res.status(503).json({
      success: false,
      message:
        "Database is not responding. Please check if MongoDB is running.",
      error: "DATABASE_NOT_RESPONDING",
    });
  }
};
