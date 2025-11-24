const express = require("express");
const router = express.Router();
const { getMerchants, createMerchant, getMerchant, updateMerchant, deleteMerchant, activeMerchant, changeActiveMerchant } = require("../controller/merchant");

router.route("/account").get(getMerchants).post(createMerchant);
router.route("/active").get(activeMerchant);
router.route("/active/:id").post(changeActiveMerchant);

router
  .route("/:id").get(getMerchant).delete(deleteMerchant).put(updateMerchant);
module.exports = router;
