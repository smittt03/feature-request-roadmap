
const mongoose = require("mongoose");
const Post = require("../models/Post");

const createPost = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        message: "Title, description and category are required",
      });
    }

    const allowedCategories = [
      "UI/UX",
      "Integrations",
      "Performance",
      "General",
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        message: "Invalid category",
      });
    }

    const post = await Post.create({
      title: title.trim(),
      description: description.trim(),
      category,
      author: req.user.id,
    });

    const populatedPost = await Post.findById(post._id)
      .populate("author", "name email");

    return res.status(201).json({
      message: "Feature request created successfully",
      post: populatedPost,
    });
  } catch (error) {
    console.error("Create post error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the feature request",
    });
  }
};

const getPosts = async (req, res) => {
  try {
    const {
      search = "",
      category,
      status,
      sort = "newest",
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    let sortOption = { createdAt: -1 };

    if (sort === "mostUpvoted") {
      sortOption = { voteCount: -1, createdAt: -1 };
    } else if (sort === "mostDiscussed") {
      sortOption = { commentCount: -1, createdAt: -1 };
    } else if (sort === "trending") {
      sortOption = { voteCount: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      Post.find(filter)
        .populate("author", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),

      Post.countDocuments(filter),
    ]);

    return res.status(200).json({
      posts,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
    });
  } catch (error) {
    console.error("Get posts error:", error);

    return res.status(500).json({
      message: "Something went wrong while fetching feature requests",
    });
  }
};

const toggleVote = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid feature request ID",
      });
    }

    // Atomically add a vote only when the user has not voted.
    const addedPost = await Post.findOneAndUpdate(
      {
        _id: postId,
        votes: { $ne: userId },
      },
      {
        $addToSet: { votes: userId },
        $inc: { voteCount: 1 },
      },
      { new: true }
    );

    if (addedPost) {
      return res.status(200).json({
        message: "Vote added successfully",
        voteCount: addedPost.voteCount,
        hasVoted: true,
      });
    }

    // If the vote already exists, atomically remove it.
    const removedPost = await Post.findOneAndUpdate(
      {
        _id: postId,
        votes: userId,
      },
      {
        $pull: { votes: userId },
        $inc: { voteCount: -1 },
      },
      { new: true }
    );

    if (removedPost) {
      return res.status(200).json({
        message: "Vote removed successfully",
        voteCount: removedPost.voteCount,
        hasVoted: false,
      });
    }

    const postExists = await Post.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({
        message: "Feature request not found",
      });
    }

    return res.status(409).json({
      message: "Vote could not be updated. Please try again.",
    });
  } catch (error) {
    console.error("Toggle vote error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating the vote",
    });
  }
};

const updatePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        message: "Invalid feature request ID",
      });
    }

    // Only admins can change feature request status.
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can update feature request status",
      });
    }

    const allowedStatuses = [
      "Under Review",
      "Planned",
      "In Progress",
      "Completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        allowedStatuses,
      });
    }

    const post = await Post.findByIdAndUpdate(
      postId,
      { status },
      {
        new: true,
        runValidators: true,
      }
    ).populate("author", "name");

    if (!post) {
      return res.status(404).json({
        message: "Feature request not found",
      });
    }

    return res.status(200).json({
      message: "Feature request status updated successfully",
      post,
    });
  } catch (error) {
    console.error("Update post status error:", error);

    return res.status(500).json({
      message: "Something went wrong while updating the status",
    });
  }
};

const getRoadmap = async (req, res) => {
  try {
    const roadmapStatuses = [
      "Planned",
      "In Progress",
      "Completed",
    ];

    const posts = await Post.find({
      status: { $in: roadmapStatuses },
    })
      .populate("author", "name")
      .sort({ updatedAt: -1 })
      .lean();

    const roadmap = {
      planned: posts.filter((post) => post.status === "Planned"),
      inProgress: posts.filter((post) => post.status === "In Progress"),
      completed: posts.filter((post) => post.status === "Completed"),
    };

    return res.status(200).json({
      roadmap,
      counts: {
        planned: roadmap.planned.length,
        inProgress: roadmap.inProgress.length,
        completed: roadmap.completed.length,
      },
    });
  } catch (error) {
    console.error("Get roadmap error:", error);

    return res.status(500).json({
      message: "Something went wrong while fetching the roadmap",
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  toggleVote,
  updatePostStatus,
  getRoadmap,
};