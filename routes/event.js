const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/protect");
const {
  createEvent,
  getOrgEvents,
  getPublicEvent,
  updateEvent,
  deleteEvent,
  submitEventFeedback,
  analyzeEvent,
} = require("../controller/event");

// Публик: арга хэмжээний дэлгэрэнгүй (QR уншихад ашиглана)
router.route("/:id").get(getPublicEvent);

// Публик: арга хэмжээнд сэтгэгдэл илгээх
router.route("/:id/feedback").post(submitEventFeedback);

// Байгууллагын токен шаардлагатай
router.route("/").post(protect, createEvent);
router.route("/org/:orgId").get(protect, getOrgEvents);
router.route("/:id/update").put(protect, updateEvent);
router.route("/:id/delete").delete(protect, deleteEvent);
router.route("/:id/analyze").post(protect, analyzeEvent);

module.exports = router;
