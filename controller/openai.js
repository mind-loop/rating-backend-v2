const { generateFinalText } = require("../middleware/ai");
const asyncHandler = require("../middleware/asyncHandle");
exports.OPENAI_ask = asyncHandler(async (req, res, next) => {
  const { userText } = req.body;
  const answer = await generateFinalText(userText);
  return res.status(200).json({
    message: "Бүртгэл амжилттай!",
    body: {
      message: "Success (:",
      answer,
    },
  });
});
