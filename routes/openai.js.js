const express = require("express");
const router = express.Router();
const { OPENAI_ask } = require("../controller/openai");

router.route("/question-fix").post(OPENAI_ask);
module.exports = router;
