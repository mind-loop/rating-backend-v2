const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v1.0.0",
      message: "RATING New API is here",
      date: "2025-10-04"
    },
    success: true,
  });
});
module.exports = router;
