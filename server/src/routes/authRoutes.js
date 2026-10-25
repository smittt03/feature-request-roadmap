
const express = require("express");

const {
  signup,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);

router.get("/verify-email", verifyEmail);

router.post("/login", login);

router.post("/refresh", refreshToken);

router.post("/logout", logout);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

// Temporary protected route for testing authentication.
router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "Authentication successful",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
