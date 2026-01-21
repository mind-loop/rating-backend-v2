const { Op } = require("sequelize");
const asyncHandler = require("../middleware/asyncHandle");
const MyError = require("../utils/myError");
const paginate = require("../utils/paginate-sequelize");
const { generateRateAnalyze, generateFinalText } = require("../middleware/ai");
exports.getOrganizationsRate = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 1000, sort, select, ...filters } = req.query;
  ["select", "sort", "page", "limit"].forEach((el) => delete req.query[el]);

  const where = { ...filters };

  const pagination = await paginate(page, limit, req.db.ratings);

  const query = {
    offset: pagination.offset,
    limit,
    where,
    include: [{ model: req.db.organization, as: "organization" }],
  };

  if (select) {
    query.attributes = select.split(","); // comma separated string
  }

  if (sort) {
    query.order = sort
      .split(",")
      .map((el) => [
        el.charAt(0) === "-" ? el.substring(1) : el,
        el.charAt(0) === "-" ? "DESC" : "ASC",
      ]);
  }

  const ratings = await req.db.ratings.findAll(query);

  res.status(200).json({
    message: "Success (:",
    body: {
      success: true,
      items: ratings,
      pagination,
    },
  });
});

exports.getOrganizationRate = asyncHandler(async (req, res, next) => {
  const { role } = req;
  let organizationId = req.params.id;
  if (!role == "admin" || !role == "user") {
    throw new MyError("Filter not found", 501);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const sort = req.query.sort;
  let select = req.query.select;

  if (select) {
    select = select.split(" ");
  }

  ["select", "sort", "page", "limit"].forEach((el) => delete req.query[el]);
  const where = { ...req.query, organizationId };
  const pagination = await paginate(page, limit, req.db.ratings, where);

  let query = { offset: pagination.start - 1, limit };

  if (req.query) {
    query.where = where;
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

  const ratings = await req.db.ratings.findAll(query);
  res.status(200).json({
    message: "Success (:",
    body: {
      success: true,
      items: ratings,
      pagination,
    },
  });
});

exports.getAnalyzeRate = asyncHandler(async (req, res, next) => {
  const { ratings } = req.body;
  const organizationId = req.params.id;
  if (ratings.length === 0) {
    throw new MyError("Ratings not found", 404);
  }

  // Organization-г олох
  const organization = await req.db.organization.findByPk(organizationId);
  if (!organization) {
    throw new MyError("Organization олдсонгүй.", 404);
  }
  if (organization.ai_analize_count <= 0) {
    throw new MyError(
      "Анализ хийх боломжгүй. Таны сэтгэгдэл боловсруулах эрх дууслаа.",
      400,
    );
  }
  const analysis = await generateRateAnalyze(ratings);
  // 1 оноо хасах
  organization.ai_analize_count -= 1;
  await organization.save();
  // Response буцаах
  res.status(200).json({
    message: "Success (:",
    body: analysis,
  });
});
exports.getOrganizationAnalytics = asyncHandler(async (req, res) => {
  const { organizationIds, startDate, endDate } = req.body;
  const userRole = req.user.role; // middleware-аар авсан user объект
  const userOrgId = req.user.organizationId;

  const data = await analyticsService.generateAnalytics({
    userRole,
    userOrgId,
    organizationIds,
    startDate,
    endDate,
  });

  res.status(200).json({ data });
});

exports.ratingRemove = asyncHandler(async (req, res, next) => {
  const { role } = req;
  if (!role == "admin" || !role == "user") {
    throw new MyError("Remove Filter not found", 501);
  }
  const { id } = req.params;
  if (!id) {
    throw new MyError("Filter not found", 501);
  }
  const rating = await req.db.ratings.findOne({ where: { id } });
  if (!rating) {
    throw new MyError("Rating not found", 404);
  }
  await rating.destroy();
  res.status(200).json({
    message: "Success (:",
    body: {
      success: true,
    },
  });
});

exports.updateRatings = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    throw new MyError("ID not found", 400);
  }
  // Update хийх
  const [updated] = await req.db.ratings.update(req.body, {
    where: { id },
  });

  if (updated === 0) {
    throw new MyError("Rating not found", 404);
  }

  res.status(200).json({
    message: "Success (:",
    body: { success: true },
  });
});

exports.createRatings = asyncHandler(async (req, res, next) => {
  const { organizationId } = req.body;
  if (!organizationId) {
    throw new MyError("Not Found Organization", 404);
  }
  // 1. Үнэлгээг хадгалах
  await req.db.ratings.create(req.body);

  // 2. Тухайн байгууллагын бүх үнэлгээг авч, дундаж ба нийт тооцоолох
  const ratings = await req.db.ratings.findAll({
    where: { organizationId },
    attributes: ["score"],
  });

  const totalRatings = ratings.length;
  const averageRating =
    totalRatings > 0
      ? ratings.reduce((acc, r) => acc + r.score, 0) / totalRatings
      : 0;

  // 3. Байгууллагын мэдээлэл шинэчлэх
  await req.db.organization.update(
    {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalRatings,
    },
    {
      where: { id: organizationId },
    },
  );

  // 4. Хариу буцаах
  res.status(200).json({
    message: "Feedback амжилттай илгээгдлээ!",
    body: { success: true },
  });
});

exports.createAIAnalyzeRatings = asyncHandler(async (req, res) => {
  const { organizationId, comment, score } = req.body;

  // 1. Validation
  if (!organizationId) {
    throw new MyError("Organization not found", 404);
  }

  // 2. Comment байгаа бол AI анализ хийх
  const trimmedComment = comment?.trim();
  const analyzedComment = trimmedComment
    ? await generateFinalText(trimmedComment)
    : null;

  // 3. Үнэлгээг хадгалах
  await req.db.ratings.create({
    organizationId,
    score,
    comment: analyzedComment, // null бол DB ignore / allow null
  });

  // 4. Байгууллагын үнэлгээний статистик
  const ratings = await req.db.ratings.findAll({
    where: { organizationId },
    attributes: ["score"],
  });

  const totalRatings = ratings.length;
  const averageRating = totalRatings
    ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings
    : 0;

  // 5. Байгууллагын мэдээлэл шинэчлэх
  await req.db.organization.update(
    {
      totalRatings,
      averageRating: Number(averageRating.toFixed(1)),
    },
    { where: { id: organizationId } }
  );

  // 6. Response
  res.status(200).json({
    success: true,
    message: "Feedback амжилттай илгээгдлээ!",
  });
});

