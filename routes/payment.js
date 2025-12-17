const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/protect");
const {
  getInvoiceQpay,
  deleteInvoice,
  newExpireOrganizationInvoiceQpay,
  newInvoiceAiAnaliticsCouponInvoiceQpay,
  newCustomPaid,
  getInvoice,
  getOrganizationInvoices,
  getMyOrganizationInvoices,
} = require("../controller/qpay");

router
  .route("/qpay-invoice/ai-analitics-coupon")
  .post(protect, newInvoiceAiAnaliticsCouponInvoiceQpay);
router
  .route("/qpay-invoice/expire")
  .post(protect, newExpireOrganizationInvoiceQpay);
router
  .route("/qpay-invoice/list")
  .get(protect, authorize("admin"), getInvoiceQpay);
router
  .route("/qpay-invoice/organization/:organization_register")
  .get(protect, authorize("admin"), getOrganizationInvoices);
router
  .route("/qpay-invoice/my-organization")
  .get(protect, getMyOrganizationInvoices);
router
  .route("/custom-paid/:id")
  .post(protect, authorize("admin"), newCustomPaid);
router
  .route("/qpay-invoice/:invoice_id")
  .delete(protect, authorize("admin"), deleteInvoice)
  .get(protect, getInvoice);

module.exports = router;
