const express = require("express");

const {
  createPost,
  getPosts,
  toggleVote,
  updatePostStatus,
  getRoadmap,
} = require("../controllers/postController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Public feature request feed.
router.get("/", getPosts);

// Public roadmap with three columns.
router.get("/roadmap", getRoadmap);

// Create a feature request.
router.post("/", authMiddleware, createPost);

// Toggle a vote.
router.post("/:postId/vote", authMiddleware, toggleVote);

// Admin-only status update.
router.patch("/:postId/status", authMiddleware, updatePostStatus);

module.exports = router;