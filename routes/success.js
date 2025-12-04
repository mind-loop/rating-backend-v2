const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v2.0.7",
      message: "Org Updates.",
      date: "2025-12-04"
    },
    success: true,
  });
});
module.exports = router;
