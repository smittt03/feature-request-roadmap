const express = require("express");

const {
  signup,
  verifyEmail,
  login,
  refreshToken,
  logout,
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);

router.get("/verify-email", verifyEmail);

router.post("/login", login);

router.post("/refresh", refreshToken);

router.post("/logout", logout);

module.exports = router;