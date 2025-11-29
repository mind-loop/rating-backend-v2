const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v2.0.1",
      message: "RATING New API is here",
      date: "2025-11-29"
    },
    success: true,
  });
});
module.exports = router;
