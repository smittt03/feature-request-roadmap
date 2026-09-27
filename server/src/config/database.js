require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb://127.0.0.1:27017/feature_request_portal"
    );

    console.log("MongoDB connected successfully ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;