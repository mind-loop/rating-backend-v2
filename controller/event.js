const asyncHandler = require("../middleware/asyncHandle");
const MyError = require("../utils/myError");
const { generateEventAnalyze } = require("../middleware/ai");

// POST /api/v1/event — Арга хэмжээ үүсгэх (байгууллагын токен шаардлагатай)
exports.createEvent = asyncHandler(async (req, res) => {
  const organizationId = req.userId;
  const { name, description, eventDate } = req.body;

  if (!organizationId) throw new MyError("Байгууллагын эрх шаардлагатай", 403);
  if (!name || !name.trim()) throw new MyError("Арга хэмжээний нэр оруулна уу", 400);

  const event = await req.db.events.create({
    organizationId,
    name: name.trim(),
    description: description?.trim() || null,
    eventDate: eventDate || null,
    isActive: true,
  });

  res.status(200).json({ success: true, body: event });
});

// GET /api/v1/event/org/:orgId — Байгууллагын арга хэмжээнүүдийг авах
exports.getOrgEvents = asyncHandler(async (req, res) => {
  const organizationId = req.params.orgId;
  if (!organizationId) throw new MyError("Байгууллагын ID шаардлагатай", 400);

  const events = await req.db.events.findAll({
    where: { organizationId },
    order: [["createdAt", "DESC"]],
  });

  res.status(200).json({ success: true, body: { items: events } });
});

// GET /api/v1/event/:id — Нэг арга хэмжээний дэлгэрэнгүй мэдээлэл (публик)
exports.getPublicEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await req.db.events.findOne({
    where: { id },
    include: [
      {
        model: req.db.organization,
        as: "organization",
        attributes: ["id", "business_name", "logoUrl", "business_description", "averageRating", "totalRatings"],
      },
    ],
  });

  if (!event) throw new MyError("Арга хэмжээ олдсонгүй", 404);

  res.status(200).json({ success: true, body: event });
});

// PUT /api/v1/event/:id — Арга хэмжээ засах
exports.updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.userId;

  const event = await req.db.events.findByPk(id);
  if (!event) throw new MyError("Арга хэмжээ олдсонгүй", 404);
  if (event.organizationId !== organizationId) throw new MyError("Та энэ арга хэмжээг засах эрхгүй", 403);

  const { name, description, eventDate, isActive } = req.body;
  await event.update({
    name: name?.trim() ?? event.name,
    description: description?.trim() ?? event.description,
    eventDate: eventDate ?? event.eventDate,
    isActive: isActive !== undefined ? isActive : event.isActive,
  });

  res.status(200).json({ success: true, body: event });
});

// DELETE /api/v1/event/:id — Арга хэмжээ устгах
exports.deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.userId;

  const event = await req.db.events.findByPk(id);
  if (!event) throw new MyError("Арга хэмжээ олдсонгүй", 404);
  if (event.organizationId !== organizationId) throw new MyError("Та энэ арга хэмжээг устгах эрхгүй", 403);

  await event.destroy();
  res.status(200).json({ success: true, message: "Арга хэмжээ амжилттай устгагдлаа" });
});

// POST /api/v1/event/:id/feedback — Арга хэмжээнд сэтгэгдэл илгээх (публик)
exports.submitEventFeedback = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  const { score, comment } = req.body;

  if (!score || score < 1 || score > 5) throw new MyError("Оноо 1-5 байх ёстой", 400);

  const event = await req.db.events.findByPk(eventId);
  if (!event) throw new MyError("Арга хэмжээ олдсонгүй", 404);
  if (!event.isActive) throw new MyError("Арга хэмжээний сэтгэгдэл хаагдсан байна", 400);

  const { generateFinalText } = require("../middleware/ai");
  const trimmedComment = comment?.trim();
  const analyzedComment = trimmedComment ? await generateFinalText(trimmedComment) : null;

  await req.db.ratings.create({
    organizationId: event.organizationId,
    eventId: parseInt(eventId),
    score,
    comment: analyzedComment,
  });

  // Байгууллагын нийт статистикийг шинэчлэх
  const allRatings = await req.db.ratings.findAll({
    where: { organizationId: event.organizationId },
    attributes: ["score"],
  });
  const totalRatings = allRatings.length;
  const averageRating = totalRatings
    ? allRatings.reduce((sum, r) => sum + r.score, 0) / totalRatings
    : 0;

  await req.db.organization.update(
    { totalRatings, averageRating: Number(averageRating.toFixed(1)) },
    { where: { id: event.organizationId } }
  );

  res.status(200).json({ success: true, message: "Сэтгэгдэл амжилттай илгээгдлээ!" });
});

// POST /api/v1/event/:id/analyze — Арга хэмжээний сэтгэгдлүүдийг AI-р шинжлэх
exports.analyzeEvent = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  const organizationId = req.userId;
  const { purpose } = req.body;

  const event = await req.db.events.findByPk(eventId);
  if (!event) throw new MyError("Арга хэмжээ олдсонгүй", 404);
  if (event.organizationId !== organizationId) throw new MyError("Та энэ арга хэмжээний шинжилгээ хийх эрхгүй", 403);

  const organization = await req.db.organization.findByPk(organizationId);
  if (!organization) throw new MyError("Байгууллага олдсонгүй", 404);
  if (organization.ai_analize_count <= 0) {
    throw new MyError("Анализ хийх боломжгүй. Таны AI боловсруулах эрх дууслаа.", 400);
  }

  const ratings = await req.db.ratings.findAll({
    where: { eventId },
    attributes: ["score", "comment"],
  });

  if (!ratings.length) throw new MyError("Энэ арга хэмжээнд сэтгэгдэл байхгүй байна", 404);

  // AI count хасах
  organization.ai_analize_count -= 1;
  await organization.save();

  const analysisPurpose = purpose
    ? `Арга хэмжээ: "${event.name}". ${event.description ? `Тайлбар: ${event.description}. ` : ""}Боловсруулах зорилго: ${purpose}`
    : `Арга хэмжээ: "${event.name}". ${event.description ? `Тайлбар: ${event.description}.` : ""}`;

  try {
    const analysis = await generateEventAnalyze(ratings, analysisPurpose);
    res.status(200).json({
      success: true,
      body: {
        ...analysis,
        eventId: event.id,
        eventName: event.name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "AI боловсруулалт амжилтгүй боллоо.", error: error.message });
  }
});
