
const express = require("express");

const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// View discussion publicly.
router.get("/posts/:postId/comments", getComments);

// Login required to participate.
router.post("/posts/:postId/comments", authMiddleware, createComment);

// Only the author or an admin may edit or delete.
router.patch("/comments/:commentId", authMiddleware, updateComment);
router.delete("/comments/:commentId", authMiddleware, deleteComment);

module.exports = router;
