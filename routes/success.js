const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v2.0.8",
      message: "AI Analize coupon Updates.",
      date: "2026-01-06"
    },
    success: true,
  });
});
module.exports = router;
