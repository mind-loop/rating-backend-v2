const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v2.0.13",
      message: "AI Analize sent successfully fixed!",
      date: "2026-06-25"
    },
    success: true,
  });
});
module.exports = router;
