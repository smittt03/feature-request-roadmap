
const express = require("express");

const {
  createPost,
  getPosts,
  toggleVote,
} = require("../controllers/postController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPosts);
router.post("/", authMiddleware, createPost);
router.post("/:postId/vote", authMiddleware, toggleVote);

module.exports = router;
