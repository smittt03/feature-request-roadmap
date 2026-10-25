
const mongoose = require("mongoose");

const Comment = require("../models/Comment");
const Post = require("../models/Post");

const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentComment } = req.body;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid feature request ID",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    if (content.trim().length > 5000) {
      return res.status(400).json({
        message: "Comment cannot exceed 5000 characters",
      });
    }

    const postExists = await Post.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({
        message: "Feature request not found",
      });
    }

    if (parentComment) {
      if (!mongoose.isValidObjectId(parentComment)) {
        return res.status(400).json({
          message: "Invalid parent comment ID",
        });
      }

      const parent = await Comment.findOne({
        _id: parentComment,
        post: postId,
      });

      if (!parent) {
        return res.status(404).json({
          message: "Parent comment not found for this feature request",
        });
      }
    }

    const comment = await Comment.create({
      content: content.trim(),
      post: postId,
      author: userId,
      parentComment: parentComment || null,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate("author", "name")
      .lean();

    await Post.updateOne(
      { _id: postId },
      { $inc: { commentCount: 1 } }
    );

    return res.status(201).json({
      message: "Comment created successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the comment",
    });
  }
};

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid feature request ID",
      });
    }

    const postExists = await Post.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({
        message: "Feature request not found",
      });
    }

    const comments = await Comment.find({ post: postId })
      .populate("author", "name")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      message: "Something went wrong while fetching comments",
    });
  }
};

const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        message: "Invalid comment ID",
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    if (content.trim().length > 5000) {
      return res.status(400).json({
        message: "Comment cannot exceed 5000 characters",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const isAuthor = comment.author.toString() === userId;
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to edit this comment",
      });
    }

    comment.content = content.trim();
    await comment.save();

    const updatedComment = await Comment.findById(commentId)
      .populate("author", "name")
      .lean();

    return res.status(200).json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Update comment error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating the comment",
    });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        message: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const isAuthor = comment.author.toString() === userId;
    const isAdmin = userRole === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        message: "You are not allowed to delete this comment",
      });
    }

    // Keep replies intact and detach them from the deleted comment.
    await Comment.updateMany(
      { parentComment: comment._id },
      { $set: { parentComment: null } }
    );

    await Comment.deleteOne({ _id: comment._id });

    await Post.updateOne(
      { _id: comment.post },
      { $inc: { commentCount: -1 } }
    );

    return res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      message: "Something went wrong while deleting the comment",
    });
  }
};

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
};
