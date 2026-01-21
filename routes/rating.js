const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/protect");
const { createRatings, getOrganizationRate, getOrganizationsRate, ratingRemove, getAnalyzeRate, updateRatings, createAIAnalyzeRatings } = require("../controller/rating");
const { getAuthOrganizationAnalytics } = require("../controller/organization");

router.route("/").post(createRatings);
router.route("/ai").post(createAIAnalyzeRatings);
router.route("/organization").get(protect, getOrganizationRate);
router.route("/user/organization").get(protect, getOrganizationsRate);
router.route("/organization/:id").get(protect, getOrganizationRate).delete(protect, ratingRemove);
router.route("/analyze").post(protect, authorize("admin","user"), getAuthOrganizationAnalytics);
router.route("/analyze/:id").post(protect, getAnalyzeRate);
router.route("/:id").put(updateRatings);

module.exports = router;