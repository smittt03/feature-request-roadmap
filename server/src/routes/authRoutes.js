const express = require("express");

const {
  signup,
  verifyEmail,
} = require("../controllers/authController");

const router = express.Router();

router.post("/signup", signup);
router.get("/verify-email", verifyEmail);

module.exports = router;