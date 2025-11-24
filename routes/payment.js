const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/protect");
const { getInvoiceQpay, deleteInvoice, newExpireOrganizationInvoiceQpay, newInvoiceAiAnaliticsCouponInvoiceQpay } = require("../controller/qpay");

router.route("/qpay-invoice/ai-analitics-coupon").post(protect, newInvoiceAiAnaliticsCouponInvoiceQpay)
router.route("/qpay-invoice/expire").post(protect, newExpireOrganizationInvoiceQpay)
router.route("/qpay-invoice/list").get(getInvoiceQpay);
router.route("/qpay-invoice/:id").delete(deleteInvoice)


module.exports = router;