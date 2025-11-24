const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/protect");

const {
  getOrganizations,
  register,
  signIn,
  organizationInfo,
  removeOrganization,
  forgotPassword,
  updateOrganizationInfo,
  changePassword,
  getOrganization,
  callBackExpireDue,
  getOtherOrganizationsIntegration,
  getAuthOrganizations,
  callBackAiAnalyzeCount,
} = require("../controller/organization");

router.route("/").get(getOrganizations);
router.route("/auth/register").post(protect,authorize("admin","user"),register);
router.route("/auth").get(protect,authorize("admin","user"),  getAuthOrganizations);
router.route("/register").post(register);
router.route("/signin").post(signIn);
router.route("/update").put(protect, updateOrganizationInfo);
router.route("/update/:id").put(protect, updateOrganizationInfo);
router.route("/info")
  .get(protect, organizationInfo);
router.route("/:id").get(getOrganization);
router.route("/payment/:id/extend-expiry").get(callBackExpireDue);
router.route("/payment/:id/ai-analitics").get(callBackAiAnalyzeCount);
// Integration
router.route("/integration").post(getOtherOrganizationsIntegration);
router
  .route("/forgot-password")
  .put(forgotPassword);
router
  .route("/change-password")
  .put(protect, changePassword);
router
  .route("/:id")
  .delete(protect, removeOrganization);
module.exports = router;
