
const express = require("express");

const {
  createPost,
  getPosts,
} = require("../controllers/postController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Public feed: anyone can view feature requests.
router.get("/", getPosts);

// Creating feature requests requires login.
router.post("/", authMiddleware, createPost);

module.exports = router;
