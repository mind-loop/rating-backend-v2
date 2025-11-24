const asyncHandler = require("../middleware/asyncHandle");
const MyError = require("../utils/myError");
const paginate = require("../utils/paginate-sequelize");
exports.createMerchant = asyncHandler(async (req, res, next) => {
  const { body } = req;
  const merchant = await req.db.merchant.create({
    ...body
  })
  if (!merchant) {
    throw new MyError("Нэмэх явцад алдаа гарлаа", 400);
  }

  res.status(200).json({
    message: "",
    body: { success: true },
  });
})
exports.getMerchant = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  if (!id) {
    throw new MyError("Мэдээлэл олдсонгүй", 400);
  }
  const merchant = await req.db.merchant.findByPk(id)
  res.status(200).json({
    message: "",
    body: merchant,
  });
})
exports.getMerchants = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const sort = req.query.sort;
  let select = req.query.select;

  if (select) {
    select = select.split(" ");
  }

  ["select", "sort", "page", "limit"].forEach((el) => delete req.query[el]);

  const pagination = await paginate(page, limit, req.db.merchant);

  let query = { offset: pagination.start - 1, limit };

  if (req.query) {
    if (!req.userId) {
      req.query = { ...req.query }
    }
    query.where = req.query;
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

  const merchant = await req.db.merchant.findAll(query);
  res.status(200).json({
    success: true,
    body: {
      items: merchant, total: merchant.length,
      pagination
    }
  }
  );
})
exports.deleteMerchant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const merchant = await req.db.merchant.findByPk(id);
  if (!merchant) {
    throw new MyError(`Таны устгах гэсэн ${id} дугаартай мэдээлэл олдсонгүй`, 404)
  }
  await merchant.destroy();

  res.status(200).json({
    message: "merchant Deleted",
    body: { success: true }
  });
});
exports.activeMerchant = asyncHandler(async (req, res, next) => {
  const merchant = await req.db.merchant.findOne({
    where:{
      is_active:true
    }
  })
  res.status(200).json({
    message: "",
    body: merchant,
  });
});

exports.changeActiveMerchant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const merchant = await req.db.merchant.findByPk(id);

  if (!merchant) {
    throw new MyError("Merchant олдсонгүй", 404);
  }

  await req.db.merchant.update(
    { is_active: false },
    { where: {} }
  );
  await req.db.merchant.update(
    { is_active: true },
    { where: { id } }
  );
  res.status(200).json({
    success: true,
    message: `Merchant (${merchant.name || "id: " + id}) идэвхжлээ`
  });
});

exports.updateMerchant = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const merchant = await req.db.merchant.update({ ...req.body }, {
    where: {
      id
    }
  })
  if (!merchant) {
    throw new MyError("Мэдээллийг шинэчилэх явцад алдаа гарлаа", 401)
  }
  res.status(200).json({
    message: "Success",
    body: { success: true }
  });
});