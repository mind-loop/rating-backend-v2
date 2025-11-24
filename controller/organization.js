const { Op, where } = require("sequelize");
const today = new Date();

const paginate = require("../utils/paginate-sequelize");
const MyError = require("../utils/myError");
const bcrypt = require("bcrypt");
const { generateLengthPass, calculateNewExpiry } = require("../utils/common");
const { sendHtmlEmail } = require("../middleware/email");
const asyncHandler = require("../middleware/asyncHandle");
const { Sequelize } = require("sequelize");
const {
  analyzeOrganization,
  analyzeOrganizations,
} = require("../middleware/ai");
exports.getOrganizations = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const sort = req.query.sort;
  let select = req.query.select;

  if (select) {
    select = select
      .split(" ")
      .filter(
        (field) =>
          !["password", "resetPasswordToken", "resetPasswordExpire"].includes(
            field
          )
      );
  }

  ["select", "sort", "page", "limit"].forEach((el) => delete req.query[el]);

  const today = new Date();

  // -------------------------------
  // PRIVATE/GOVERNMENT filter (WHERE)
  // -------------------------------
  const whereFilter = {
    ...req.query,
    [Op.or]: [
      {
        expired_date: {
          [Op.or]: [{ [Op.eq]: null }, { [Op.gte]: today }],
        },
      },
    ],
  };
  // paginate must count filtered rows!
  const pagination = await paginate(
    page,
    limit,
    req.db.organization,
    whereFilter
  );
  const query = {
    offset: pagination.offset,
    limit,
    where: whereFilter,
  };

  if (select?.length) {
    query.attributes = select;
  } else {
    query.attributes = {
      exclude: ["password", "resetPasswordToken", "resetPasswordExpire"],
    };
  }

  if (sort) {
    query.order = sort
      .split(" ")
      .map((el) => [
        el.charAt(0) === "-" ? el.substring(1) : el,
        el.charAt(0) === "-" ? "DESC" : "ASC",
      ]);
  }

  const organizations = await req.db.organization.findAll(query);

  res.status(200).json({
    success: true,
    body: { items: organizations, pagination },
  });
});

exports.getAuthOrganizations = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const sort = req.query.sort;
  let select = req.query.select;
  const { role, userId } = req;
  if (select) {
    select = select
      .split(" ")
      .filter(
        (field) =>
          !["password", "resetPasswordToken", "resetPasswordExpire"].includes(
            field
          )
      );
  }

  ["select", "sort", "page", "limit"].forEach((el) => delete req.query[el]);

  const today = new Date();

  // -------------------------------
  // PRIVATE/GOVERNMENT filter (WHERE)
  // -------------------------------
  const whereFilter = {
    ...req.query,
    ...(role === "admin" ? {} : { userId }),
  };
  // paginate must count filtered rows!
  const pagination = await paginate(
    page,
    limit,
    req.db.organization,
    whereFilter
  );
  const query = {
    offset: pagination.offset,
    limit,
    where: whereFilter,
  };

  if (select?.length) {
    query.attributes = select;
  } else {
    query.attributes = {
      exclude: ["password", "resetPasswordToken", "resetPasswordExpire"],
    };
  }

  if (sort) {
    query.order = sort
      .split(" ")
      .map((el) => [
        el.charAt(0) === "-" ? el.substring(1) : el,
        el.charAt(0) === "-" ? "DESC" : "ASC",
      ]);
  }

  const organizations = await req.db.organization.findAll(query);

  res.status(200).json({
    success: true,
    body: { items: organizations, pagination },
  });
});
exports.getOrganization = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await req.db.organization.findOne({
    where: {
      id,
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

exports.register = asyncHandler(async (req, res, next) => {
  const { userId, role } = req;
  const new_password = generateLengthPass(6);
  // 1. role байхгүй бол userId дамжуулахгүй
  const organizationData = {
    ...req.body,
    ...(role ? { userId } : {}),
    password: new_password,
  };

  // 2. Өгөгдлийг үүсгэх
  const organization = await req.db.organization.create({
    ...organizationData,
    expired_date: new Date().toISOString(),
  });

  if (!organization) {
    throw new MyError("Бүртгэж чадсангүй");
  }

  // 3. Мэдэгдлийн имэйл
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: `Шинэ бүртгэл үүслээ. Таны нууц үг: ${new_password}`,
    email: req.body.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };

  await sendHtmlEmail(emailBody);

  // 4. Хариу буцаах
  return res.status(200).json({
    message: "Бүртгэл амжилттай!",
    body: {
      token: organization.getJsonWebToken(),
      user: organization,
    },
  });
});

exports.signIn = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new MyError("Имейл эсвэл нууц үгээ оруулна уу", 400);
  }
  const user = await req.db.organization.findOne({
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

exports.organizationInfo = asyncHandler(async (req, res, next) => {
  const { userId } = req;

  const user = await req.db.organization.findOne({
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

exports.updateOrganizationInfo = asyncHandler(async (req, res, next) => {
  const { userId, role } = req;
  const { id: paramsId } = req.params;
  await req.db.organization.update(req.body, {
    where: { id: role ? paramsId : userId },
    fields: { exclude: ["password"] },
  });

  const org = await req.db.organization.findByPk(paramsId || userId);
  const emailBody = {
    title: "Санал хүсэлтийн мэдэгдэл",
    label: "Таны мэдээлэл шинэчлэгдлээ.",
    email: org.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };
  await sendHtmlEmail({ ...emailBody });
  // Таны мэдээлэл шинэчилэгдлээ гэсэн имейл шидэх

  res.status(200).json({
    message: "User updated.",
    body: { success: true },
  });
});

exports.removeOrganization = asyncHandler(async (req, res, next) => {
  const { type } = req;
  if (type != "user") {
    throw new MyError("Та бүртгэх эрхгүй байна", 501);
  }
  const userId = req.params.id;
  const organization = await req.db.organization.findByPk(userId);
  if (!organization) {
    throw new MyError(
      `Таны устгах гэсэн ${userId} дугаартай байгууллагын мэдээлэл олдсонгүй`,
      404
    );
  }
  await organization.destroy();

  res.status(200).json({
    message: "Organization Deleted",
    body: { success: true },
  });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const password = generateLengthPass(8);
  if (!email) {
    throw new MyError(`Бүртгэлгүй байна!`, 400);
  }
  const users = await req.db.organization.findOne({
    where: {
      email,
    },
  });

  if (!users) {
    throw new MyError(`${email} байгууллага олдсонгүй!`, 400);
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
  await req.db.organization.update(
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
  const id = req.userId;
  if (!id) {
    throw new MyError("Id олдсонгүй!", 400);
  }

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new MyError(
      "Хуучин болон шинэ нууц үгийг хоёуланг нь илгээнэ үү!",
      400
    );
  }
  // 1. Байгууллагын мэдээллийг авах
  const organization = await req.db.organization.findByPk(id);
  if (!organization) {
    throw new MyError("Байгууллага олдсонгүй!", 404);
  }
  // 2. Хуучин нууц үг зөв эсэхийг шалгах
  const isMatch = await bcrypt.compare(oldPassword, organization.password);
  if (!isMatch) {
    throw new MyError("Хуучин нууц үг буруу байна!", 400);
  }
  // 3. Шинэ нууц үг хэшлэх
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  // 4. Нууц үг шинэчлэх
  await req.db.organization.update(
    { password: hashedPassword },
    { where: { id } }
  );
  // 5. Имэйл мэдэгдэл илгээх
  const emailBody = {
    title: "Системийн мэдэгдэл",
    label: `Таны нууц үг амжилттай шинэчлэгдлээ`,
    email: req.email,
    from: "Системийн Админ",
    buttonText: "Систем рүү очих",
    buttonUrl: process.env.WEBSITE_URL,
    greeting: "Сайн байна уу?",
  };

  await sendHtmlEmail({ ...emailBody });

  // 6. Амжилттай хариу буцаах
  res.status(200).json({
    message: "Таны нууц үг амжилттай шинэчлэгдлээ",
    body: { success: true },
  });
});

exports.callBackExpireDue = asyncHandler(async (req, res, next) => {
  const organizationId = req.params.id;
  const {
    duration,
    price_type,
    ai_analize_count = 0,
    integrationId,
  } = req.query;

  // 1. Validate duration
  const validDurations = [1, 3, 6, 12];
  const parsedDuration = parseInt(duration);

  if (!validDurations.includes(parsedDuration)) {
    return res.status(400).json({
      success: false,
      message: "Хугацаа 1, 3, 6 эсвэл 12 сар байна.",
    });
  }

  // 2. Find organization with BOTH id and integrationId
  const organization = await req.db.organization.findOne({
    where: {
      id: organizationId,
      integrationId: integrationId,
    },
  });

  if (!organization) {
    throw new MyError("Байгууллага олдсонгүй", 404);
  }
  // 4. Determine base date (correct logic)
  let baseDate = organization.expired_date
    ? new Date(organization.expired_date)
    : new Date();

  // If expired -> start from today
  if (baseDate < new Date()) {
    baseDate = new Date();
  }

  // 5. Calculate new expiry
  const newExpiryDate = calculateNewExpiry(baseDate, parsedDuration);

  // 6. Safe increment
  const oldCount = organization.ai_analize_count || 0;
  organization.ai_analize_count = oldCount + Number(ai_analize_count);

  // 7. Update fields
  organization.expired_date = newExpiryDate;
  organization.price_type = price_type;

  await organization.save();

  // 8. Response
  res.status(200).json({
    body: {
      success: true,
      message: `${parsedDuration} сарын хугацаагаар амжилттай сунгалаа`,
      new_expired_date: newExpiryDate,
      extended_duration: parsedDuration,
    },
  });
});
exports.callBackAiAnalyzeCount = asyncHandler(async (req, res, next) => {
  const organizationId = req.params.id;
  const { integrationId, ai_analize_count } = req.query;
  // 2. Find organization with BOTH id and integrationId
  const organization = await req.db.organization.findOne({
    where: {
      id: organizationId,
      integrationId: integrationId,
    },
  });

  if (!organization) {
    throw new MyError("Байгууллага олдсонгүй", 404);
  }
  // 6. Safe increment
  const oldCount = organization.ai_analize_count || 0;
  organization.ai_analize_count = oldCount + Number(ai_analize_count);
  await organization.save();

  // 8. Response
  res.status(200).json({
    body: {
      message: `${ai_analize_count} нэмэгдэж нийт ${organization.ai_analize_count} анализ хийх эрхээр сунгалаа`,
    },
  });
});
exports.getAuthOrganizationAnalytics = asyncHandler(async (req, res) => {
  const { organizationIds, startDate, endDate } = req.body;
  const { role } = req; // middleware-аар авсан user объект
  if (!role) {
    throw new MyError("Та эрхгүй байна", 403);
  }
  if (!organizationIds || !organizationIds.length) {
    throw new MyError("organizationIds шаардлагатай байна", 400);
  }
  const organizations = await req.db.organization.findAll({
    where: { id: { [Op.in]: organizationIds } },
    include: [
      {
        model: req.db.ratings,
        as: "ratings",
        required: false,
        ...(startDate || endDate
          ? {
              where: {
                ...(startDate && {
                  createdAt: { [Op.gte]: new Date(startDate) },
                }),
                ...(endDate && { createdAt: { [Op.lte]: new Date(endDate) } }),
              },
            }
          : {}),
      },
    ],
  });
  const responseData = await analyzeOrganizations(organizations)
  res.status(200).json({
    message: "Success",
    body: { items:  responseData},
  });
});

// POST /api/organization/integration-info
exports.getOtherOrganizationsIntegration = asyncHandler(
  async (req, res, next) => {
    const { integrationId } = req.body;

    if (!integrationId) {
      throw new MyError("integrationId заавал оруулна уу", 400);
    }

    const now = new Date();

    // Бусад байгууллагуудыг filter хийх
    const organizations = await req.db.organization.findAll({
      where: {
        integrationId,
        // Төрийн байгууллага бол хугацааг шалгахгүй, бусад бол дуусаагүй байх
        [Sequelize.Op.or]: [
          {
            expired_date: {
              [Sequelize.Op.or]: [null, { [Sequelize.Op.gt]: now }],
            },
          },
        ],
      },
      attributes: [
        "id",
        "business_name",
        "organization_type",
        "business_email",
        "averageRating",
        "totalRatings",
      ],
    });

    if (!organizations || organizations.length === 0) {
      throw new MyError("Интеграцийн идэвхтэй байгууллага олдсонгүй", 404);
    }

    res.status(200).json({
      message: "Success",
      transaction: organizations,
    });
  }
);
