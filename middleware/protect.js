const jwt = require("jsonwebtoken");
const asyncHandler = require("./asyncHandle");
const MyError = require("../utils/myError");

exports.protect = asyncHandler(async (req, res, next) => {
  if (!req.headers.authorization) {
    throw new MyError(
      "Энэ үйлдлийг хийхэд таны эрх хүрэхгүй байна. Та эхлээд логин хийнэ үү. Authorization header-ээр токеноо дамжуулна уу.",
      401
    );
  }

  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    throw new MyError("Токен байхгүй байна.", 400);
  }

  const tokenObj = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = tokenObj.id;
  req.type = tokenObj.type;
  req.role=tokenObj.role
  req.email = tokenObj.email;

  next();
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      throw new MyError(
        "Таны эрх [" + req.role + "] энэ үйлдлийг гүйцэтгэхэд хүрэлцэхгүй!",
        403
      );
    }

    next();
  };
};
