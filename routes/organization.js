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
  organizationRoleChange,
  getParamsAuthOrganizations,
  remvoveRoleChange,
} = require("../controller/organization");

router.route("/").get(getOrganizations);
router.route("/auth/register").post(protect,authorize("admin","user"),register);
router.route("/auth").get(protect,authorize("admin","user"),  getAuthOrganizations);
router.route("/auth/:id").get(protect,authorize("admin","user"),  getParamsAuthOrganizations);
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
  .put(protect, changePassword);remvoveRoleChange
router
  .route("/controller-change")
  .put(protect,authorize("admin"), organizationRoleChange);
router
  .route("/remove-controller")
  .put(protect,authorize("admin"), remvoveRoleChange);
router
  .route("/:id")
  .delete(protect, removeOrganization);
module.exports = router;
