const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/protect");

const {
  getUsers,
  signUp,
  signIn,
  userInfo,
  removeUser,
  forgotPassword,
  updateUserInfo,
  changePassword,
} = require("../controller/users");

router.route("/all").get(protect, authorize("admin"),getUsers);
router.route("/signup").post(signUp);
router.route("/signin").post(signIn);
router.route("/update").put(protect, updateUserInfo);
router
  .route("/info")
  .get(protect, userInfo);
  router
  .route("/forgot-password")
  .put(forgotPassword);
  router
  .route("/change-password")
  .put(protect,changePassword);
router
  .route("/:id")
  .delete(protect, authorize("admin"), removeUser);
module.exports = router;
