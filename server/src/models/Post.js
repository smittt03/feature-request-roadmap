
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 10000,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "UI/UX",
        "Integrations",
        "Performance",
        "General",
      ],
      default: "General",
    },

    status: {
      type: String,
      enum: [
        "Under Review",
        "Planned",
        "In Progress",
        "Completed",
      ],
      default: "Under Review",
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    voteCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Search titles and descriptions.
postSchema.index({
  title: "text",
  description: "text",
});

// Support feed filtering and sorting.
postSchema.index({
  status: 1,
  category: 1,
  createdAt: -1,
});

postSchema.index({
  voteCount: -1,
  createdAt: -1,
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
