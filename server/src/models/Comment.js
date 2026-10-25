
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },

    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Retrieve comments belonging to a post in chronological order.
commentSchema.index({
  post: 1,
  createdAt: 1,
});

// Retrieve replies to a particular comment.
commentSchema.index({
  parentComment: 1,
  createdAt: 1,
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
