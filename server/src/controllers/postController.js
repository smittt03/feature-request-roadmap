
const Post = require("../models/Post");

const createPost = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (
      typeof title !== "string" ||
      typeof description !== "string" ||
      typeof category !== "string"
    ) {
      return res.status(400).json({
        message: "Title, description and category are required",
      });
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 5 || trimmedTitle.length > 120) {
      return res.status(400).json({
        message: "Title must be between 5 and 120 characters",
      });
    }

    if (
      trimmedDescription.length < 10 ||
      trimmedDescription.length > 10000
    ) {
      return res.status(400).json({
        message: "Description must be between 10 and 10000 characters",
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
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      author: req.user._id,
    });

    await post.populate("author", "name email");

    return res.status(201).json({
      message: "Feature request created successfully",
      post,
    });
  } catch (error) {
    console.error("Create post error:", error.message);

    return res.status(500).json({
      message: "Something went wrong while creating the feature request",
    });
  }
};

const getPosts = async (req, res) => {
  try {
    const {
      category,
      status,
      sort = "newest",
      page = "1",
      limit = "10",
      search,
    } = req.query;

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      return res.status(400).json({
        message: "Page must be positive and limit must be between 1 and 50",
      });
    }

    const allowedCategories = [
      "UI/UX",
      "Integrations",
      "Performance",
      "General",
    ];

    const allowedStatuses = [
      "Under Review",
      "Planned",
      "In Progress",
      "Completed",
    ];

    if (category && !allowedCategories.includes(category)) {
      return res.status(400).json({
        message: "Invalid category",
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const allowedSorts = ["newest", "mostUpvoted", "mostDiscussed"];

    if (!allowedSorts.includes(sort)) {
      return res.status(400).json({
        message: "Invalid sort option",
      });
    }

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    if (search && search.trim()) {
      filter.$text = {
        $search: search.trim(),
      };
    }

    let sortOption = { createdAt: -1 };

    if (sort === "mostUpvoted") {
      sortOption = { voteCount: -1, createdAt: -1 };
    }

    if (sort === "mostDiscussed") {
      sortOption = { commentCount: -1, createdAt: -1 };
    }

    const skip = (pageNumber - 1) * pageSize;

    const [posts, totalPosts] = await Promise.all([
      Post.find(filter)
        .populate("author", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Post.countDocuments(filter),
    ]);

    return res.status(200).json({
      posts,
      pagination: {
        currentPage: pageNumber,
        pageSize,
        totalPosts,
        totalPages: Math.ceil(totalPosts / pageSize),
      },
    });
  } catch (error) {
    console.error("Get posts error:", error.message);

    return res.status(500).json({
      message: "Something went wrong while fetching feature requests",
    });
  }
};

module.exports = {
  createPost,
  getPosts,
};
