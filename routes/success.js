const express = require("express");
const router = express.Router();
router.route("/").get((req, res) => {
  res.status(200).json({
    message: {
      version: "v2.0.4",
      message: "QPAY амжилттай холбогдлоо.",
      date: "2025-12-02"
    },
    success: true,
  });
});
module.exports = router;
