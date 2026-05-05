const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v2.0.11",
      message: "AI Analize sent successfully!",
      date: "2026-05-06"
    },
    success: true,
  });
});
module.exports = router;
