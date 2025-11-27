const asyncHandler = require("express-async-handler");
const paginate = require("../utils/paginate-sequelize");
const MyError = require("../utils/myError");
const bcrypt = require("bcrypt");
const { generateLengthPass, emailTemplate } = require("../utils/common");
const { sendHtmlEmail } = require("../middleware/email");
const { Op } = require("sequelize");
// 💡 Sequelize-ийг импортлох (жишээ нь, таны DB холболт эсвэл загварын файл дотор байдаг):
// const { Sequelize } = require('sequelize');
// OR req.db нь таны sequelize instance байж болно.

exports.getUsers = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const sort = req.query.sort;
  let select = req.query.select;

  if (select) {
    select = select.split(" ");
  } // filters гэдэгт filter хийх параметрүүдийг авна

  let filters = { ...req.query };
  ["select", "sort", "page", "limit"].forEach((el) => delete filters[el]); // 1. Pagination-д ашиглах filters-ийг шинэчлэх // Админ role-той хэрэглэгчдийг хасах нөхцөлийг filters-т нэмж байна.

  filters.role = {
    // 🚨 Энд таны Sequelize instance-ийн Op-ийг ашиглах ёстой.
    // Таны код дотор req.db-ийн бүтцийг мэдэхгүй тул req.db.Sequelize.Op-ийг загвар болгон ашиглав.
    [Op.ne]: "admin", // role != 'admin'
  }; // Эсвэл хэрэв таны Sequelize-ийн Op-ийг өөр аргаар импортолдог бол: // const Op = require('sequelize').Op; // filters.role = { [Op.ne]: 'admin' };
  const pagination = await paginate(page, limit, req.db.users, filters);

  let query = { offset: pagination.offset, limit }; // 2. Query object-д filters-ийг нэмэх // filters-ийг query.where-д нэмж байгаа тул role != admin нөхцөл энд орно
  if (Object.keys(filters).length) {
    query.where = filters;
  }

  if (select) {
    query.attributes = select;
  }

  if (sort) {
    query.order = sort
      .split(" ")
      .map((el) => [
        el.charAt(0) === "-" ? el.substring(1) : el,
        el.charAt(0) === "-" ? "DESC" : "ASC",
      ]);
  }

  const users = await req.db.users.findAll(query);

  res.status(200).json({
    success: true,
    body: { items: users, pagination },
  });
});

exports.signUp = asyncHandler(async (req, res, next) => {
  const user = await req.db.users.create({ ...req.body });
  if (!user) {
    throw new MyError("Бүртгэж чадсангүй");
  }
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Шинэ бүртгэл үүслээ`,
    email: req.body.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };
  await sendHtmlEmail({ ...emailBody });
  res.status(200).json({
    message: "",
    body: { token: user.getJsonWebToken(), user: user },
  });
});
exports.register = asyncHandler(async (req, res, next) => {
  const user = await req.db.users.create({ ...req.body, role: 'user' });
  if (!user) {
    throw new MyError("Бүртгэж чадсангүй");
  }
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Шинэ бүртгэл үүслээ`,
    email: req.body.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };
  await sendHtmlEmail({ ...emailBody });
  res.status(200).json({
    message: "",
    body: {user: user },
  });
});
exports.signIn = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new MyError("Имейл эсвэл нууц үгээ оруулна уу", 400);
  }
  const user = await req.db.users.findOne({
    where: { email },
  });
  if (!user) {
    throw new MyError("Таны нэвтрэх нэр эсхүл нууц үг буруу байна", 400);
  }

  const ok = await user.CheckPass(password);
  if (!ok) {
    throw new MyError("Таны нэвтрэх нэр эсхүл нууц үг буруу байна", 400);
  }
  res.status(200).json({
    message: "",
    body: { token: user.getJsonWebToken(), user: user },
  });
});

exports.userInfo = asyncHandler(async (req, res, next) => {
  const { userId } = req;
  const user = await req.db.users.findOne({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new MyError("Та бүртгэлтэй эсэхээ шалгана уу", 401);
  }
  res.status(200).json({
    message: "Success (:",
    body: user,
  });
});

exports.updateUserInfo = asyncHandler(async (req, res, next) => {
  const { userId } = req;
  if (req.body.password) {
    delete req.body.password;
  }
  const user = await req.db.users.findByPk(userId);
  await req.db.users.update(req.body, {
    where: { id: userId },
    fields: { exclude: ["password"] },
  });

  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Таны мэдээлэл шинэчлэгдлээ`,
    email: user.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };
  await sendHtmlEmail({ ...emailBody });

  res.status(200).json({
    message: "User updated.",
    body: { success: true },
  });
});
exports.updateCustomUserInfo = asyncHandler(async (req, res, next) => {
  const { userId, password, ...rest } = req.body;

  // password field-ийг шууд хасч байна
  // delete password; // аль аль нь адил утга
  if (!userId) {
    return res.status(400).json({ message: "User id шаардлагатай" });
  }

  // 1. User-ийг олж авах
  const user = await req.db.users.findByPk(userId);
  if (!user) {
    return res.status(404).json({ message: "User олдсонгүй" });
  }

  // 2. Update хийх (password-г update-д оруулахгүй)
  await user.update(rest); // rest-д password байхгүй тул exclude шаардлагагүй

  // 3. Email бэлтгэх
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Таны мэдээлэл шинэчлэгдлээ`,
    email: user.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };

  await sendHtmlEmail({ ...emailBody });

  // 4. Response буцаах
  res.status(200).json({
    message: "User updated.",
    body: { success: true },
  });
});

exports.removeUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const user = await req.db.users.findByPk(userId);
  if (!user) {
    throw new MyError(
      `Таны устгах гэсэн ${userId} дугаартай хэрэглэгчийн мэдээлэл олдсонгүй`,
      404
    );
  }
  await user.destroy();

  res.status(200).json({
    message: "User Deleted",
    body: { success: true },
  });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const password = generateLengthPass(8);
  if (!email) {
    throw new MyError(`Бүртгэлгүй байна!`, 400);
  }
  const users = await req.db.users.findOne({
    where: {
      email,
    },
  });
  if (!users) {
    throw new MyError(`${email} хэрэглэгч олдсонгүй!`, 400);
  }
  const salt = await bcrypt.genSalt(10);
  const new_password = await bcrypt.hash(password, salt);
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Нууц үг солигдлоо. Нууц үг:${password}`,
    email: req.body.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };
  await sendHtmlEmail({ ...emailBody });

  await req.db.users.update(
    { password: new_password },
    {
      where: {
        email,
      },
    }
  );
  res.status(200).json({
    message:
      "Таны нууц үг амжилттай сэргээгдлээ. Та бүртгэлтэй имейл хаягаараа нууц үгээ авна уу.",
    body: { success: true },
  });
});


exports.changePassword = asyncHandler(async (req, res, next) => {
  const userId = req.userId;
  if (!userId) {
    throw new MyError("Id олдсонгүй!", 400);
  }

  const { oldPassword, new_password } = req.body;
  if (!oldPassword || !new_password) {
    throw new MyError("Хуучин болон шинэ нууц үг шаардлагатай", 400);
  }

  // 1️⃣ User-г олж авах
  const user = await req.db.users.findByPk(userId);
  if (!user) {
    throw new MyError("Хэрэглэгч олдсонгүй", 404);
  }

  // 2️⃣ Хуучин password шалгах
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new MyError("Хуучин нууц үг буруу байна", 400);
  }

  // 3️⃣ Шинэ password-г hash хийх
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(new_password, salt);

  // 4️⃣ Update хийх
  await user.update({ password: hashedPassword });

  // 5️⃣ Email мэдэгдэл
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Таны нууц үг амжилттай шинэчлэгдлээ`,
    email: user.email, // req.email биш user.email
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };

  await sendHtmlEmail({ ...emailBody });
  res.status(200).json({
    message: "Таны нууц үг амжилттай шинэчлэгдлээ",
    body: { success: true },
  });
});