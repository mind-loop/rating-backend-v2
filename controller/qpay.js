const asyncHandler = require("../middleware/asyncHandle");
const axios = require("axios");
const MyError = require("../utils/myError");
const base64 = require("buffer").Buffer;
const dotenv = require("dotenv");
const exp = require("constants");
const cuid = require("cuid");
const { generatePayment, calculateNewExpiry } = require("../utils/common");
const paginate = require("../utils/paginate-sequelize");
const { parse } = require("path");
const { includes } = require("lodash");
const { Op } = require("sequelize");
dotenv.config({ path: "./config/config.env" });
const username = process.env.QPAY_USERNAME;
const password = process.env.QPAY_PASSWORD;
const INVOICE_CODE = process.env.INVOICE_CODE;
const SENDER_INVOICE_NO = "1234657";
const SENDER_BRANCH_CODE = "SALBAR1";
const QPAY_CALL_BACK_URL = process.env.QPAY_CALL_BACK_URL;

const getToken = async (
  merchant_username = username,
  merchantpassword = password
) => {
  const response = await axios.post(
    (process.env.QPAY_BASEURL || "https://merchant.qpay.mn") + "/auth/token",
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          base64
            .from(`${merchant_username}:${merchantpassword}`)
            .toString("base64"),
      },
    }
  );
  if (!response) {
    throw new MyError(`Хүсэлт амжилтгүй ..`, 400);
  }
  return response.data.access_token;
};
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const { invoice_id } = req.params;
  const invoice = await req.db.invoice.findOne({
    where: {
      invoice_id,
      status: { [Op.ne]: "paid" },
    },
  });
  if (!invoice) {
    throw new MyError(
      `Таны устгах гэсэн ${invoice_id} дугаартай мэдээлэл олдсонгүй`,
      404
    );
  }
  await invoice.destroy();

  res.status(200).json({
    message: "Invoice Deleted",
    body: { success: true },
  });
});
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const { invoice_id } = req.params;
  const invoice = await req.db.invoice.findOne({
    where: {
      invoice_id,
    },
    include: {
      model: req.db.organization,
      as: "organization",
      required: false,
      attributes: {
        exclude: ["password"],
      },
    },
  });

  res.status(200).json({
    message: "success :)",
    body: invoice,
  });
});

exports.getMyOrganizationInvoices = asyncHandler(async (req, res, next) => {
  const id = req.userId;
  const organizationWithInvoices = await req.db.organization.findOne({
    where: { id },
    attributes: {
      exclude: ["password"],
    },
    include: [
      {
        model: req.db.invoice,
        as: "invoices", // Хэрэв belongsTo/hasMany дээр "invoices" гэж заасан бол
        required: false,
      },
    ],
    order: [
      [{ model: req.db.invoice, as: "invoices" }, "createdAt", "DESC"], // Шинэ нэхэмжлэхийг дээр нь гаргах
    ],
  });

  if (!organizationWithInvoices) {
    return res.status(404).json({ message: "Байгууллага олдсонгүй" });
  }

  res.status(200).json({
    message: "success :)",
    body: organizationWithInvoices,
  });
});
exports.getOrganizationInvoices = asyncHandler(async (req, res, next) => {
  const { organization_register } = req.params;

  const organizationWithInvoices = await req.db.organization.findOne({
    where: { organization_register },
    attributes: {
      exclude: ["password"],
    },
    include: [
      {
        model: req.db.invoice,
        as: "invoices", // Хэрэв belongsTo/hasMany дээр "invoices" гэж заасан бол
        required: false,
      },
    ],
    order: [
      [{ model: req.db.invoice, as: "invoices" }, "createdAt", "DESC"], // Шинэ нэхэмжлэхийг дээр нь гаргах
    ],
  });

  if (!organizationWithInvoices) {
    return res.status(404).json({ message: "Байгууллага олдсонгүй" });
  }

  res.status(200).json({
    message: "success :)",
    body: organizationWithInvoices,
  });
});

// new invoice organization expire
exports.newExpireOrganizationInvoiceQpay = asyncHandler(
  async (req, res, next) => {
    const merchant = await req.db.merchant.findOne({
      where: {
        is_active: true,
      },
    });
    const token = await (merchant
      ? getToken(merchant.username, merchant.password)
      : getToken());

    const {
      duration,
      integrationId,
      amount,
      price_type = "basic",
      ai_analize_count,
      organizationId,
    } = req.body;
    if (
      !duration ||
      !integrationId ||
      !price_type ||
      !ai_analize_count ||
      !organizationId
    ) {
      throw new MyError("Мэдээлэлээ бүрэн дамжуулна уу", 400);
    }
    if (!token) {
      throw new MyError(`Токен байхгүй байна ..`, 400);
    }
    const uniq_generate_id = "organization_" + integrationId;
    const callback_url =
      QPAY_CALL_BACK_URL +
      `/${organizationId}/extend-expiry?duration=${duration}&integrationId=${integrationId}&price_type=${price_type}&uniq_generate_id=${uniq_generate_id}&ai_analize_count=${ai_analize_count}`;
    const new_invoice = await axios.post(
      (process.env.QPAY_BASEURL || "https://merchant.qpay.mn") + "/invoice",
      {
        invoice_code: merchant ? merchant.invoice_code : INVOICE_CODE,
        sender_invoice_no: SENDER_INVOICE_NO,
        invoice_receiver_code: "terminal",
        invoice_description: `Сунгалт: ${duration} сар, ${price_type} багц`,
        sender_branch_code: SENDER_BRANCH_CODE,
        amount: amount,
        callback_url,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      }
    );
    if (!new_invoice) {
      throw new MyError(`invoice үүссэнгүй байна ..`, 400);
    }
    const { qr_text, invoice_id } = new_invoice.data;

    const invoice_res = await req.db.invoice.create({
      bank_qr_code: qr_text,
      amount,
      sell: 0,
      invoice_id,
      callback_url,
      payment_type: "QPAY",
      uniq_generate_id,
      organizationId,
    });
    if (!invoice_res) {
      throw new MyError(`invoice үүссэнгүй байна ..`, 400);
    }
    res.status(200).json({
      message: "QPAY.",
      body: new_invoice.data,
    });
  }
);

// new qpay invoice ai coupon
exports.newInvoiceAiAnaliticsCouponInvoiceQpay = asyncHandler(
  async (req, res, next) => {
    const merchant = await req.db.merchant.findOne({
      where: {
        is_active: true,
      },
    });

    const token = await (merchant
      ? getToken(merchant.username, merchant.password)
      : getToken());

    const { integrationId, amount, ai_analize_count, organizationId } =
      req.body;
    if (!integrationId || !ai_analize_count || !amount || !organizationId) {
      throw new MyError("Мэдээлэлээ бүрэн дамжуулна уу", 400);
    }
    if (!token) {
      throw new MyError(`Токен байхгүй байна ..`, 400);
    }
    const uniq_generate_id = "analytics_ai_coupon_" + integrationId;
    const callback_url =
      QPAY_CALL_BACK_URL +
      `/${organizationId}/ai-analitics?integrationId=${integrationId}&uniq_generate_id=${uniq_generate_id}&ai_analize_count=${ai_analize_count}`;
    const new_invoice = await axios.post(
      (process.env.QPAY_BASEURL || "https://merchant.qpay.mn") + "/invoice",
      {
        invoice_code: merchant ? merchant.invoice_code : INVOICE_CODE,
        sender_invoice_no: SENDER_INVOICE_NO,
        invoice_receiver_code: "terminal",
        invoice_description: `AI Analitics Эрх: ${ai_analize_count} удаа`,
        sender_branch_code: SENDER_BRANCH_CODE,
        amount: amount,
        callback_url,
        organizationId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      }
    );
    if (!new_invoice) {
      throw new MyError(`invoice үүссэнгүй байна ..`, 400);
    }
    const { qr_text, invoice_id } = new_invoice.data;

    const invoice_res = await req.db.invoice.create({
      bank_qr_code: qr_text,
      amount,
      sell: 0,
      invoice_id,
      callback_url,
      payment_type: "QPAY",
      uniq_generate_id,
    });
    if (!invoice_res) {
      throw new MyError(`invoice үүссэнгүй байна ..`, 400);
    }
    res.status(200).json({
      message: "QPAY.",
      body: new_invoice.data,
    });
  }
);
exports.getInvoiceQpay = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;
  const sort = req.query.sort;
  let select = req.query.select;
  if (select) {
    select = select.split(" ");
  }

  ["select", "sort", "page", "limit"].forEach((el) => delete req.query[el]);

  const pagination = await paginate(page, limit, req.db.invoice);

  let query = { offset: pagination.start - 1, limit };

  if (req.query) {
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
  const invoice = await req.db.invoice.findAll(query);
  res.status(200).json({
    success: true,
    body: { items: invoice, pagination },
  });
});

// new Custom Invoice and paid changing
// new Custom Invoice and paid changing
exports.newCustomPaid = asyncHandler(async (req, res, next) => {
  // invoice_id-г body-оос заавал авна
  const {
    duration,
    integrationId,
    amount,
    price_type,
    ai_analize_count,
    invoice_id,
  } = req.body;

  // 1. Байгууллагыг шалгах
  const organization = await req.db.organization.findOne({
    where: {
      integrationId: integrationId,
    },
  });

  if (!organization) {
    throw new MyError(`Байгууллага олдсонгүй.`, 404);
  }

  if (!invoice_id || !amount) {
    throw new MyError(`Нэхэмжлэхийн мэдээлэл дутуу байна.`, 400);
  }

  // 2. Нэхэмжлэхийг олж шинэчлэх
  const invoice = await req.db.invoice.findOne({
    where: { invoice_id: invoice_id },
  });

  if (!invoice) {
    throw new MyError(`${invoice_id} дугаартай нэхэмжлэх олдсонгүй.`, 404);
  }

  // Нэхэмжлэхийн төлөвийг "paid" болгох
  await invoice.update({
    bank_qr_code: "empty",
    amount: amount,
    sell: 0,
    callback_url: "empty",
    payment_type: "Custom_Invoice",
    uniq_generate_id: "custom_" + integrationId,
    status: "paid",
  });

  // 3. Байгууллагын эрхийг сунгах логик
  const parsedDuration = parseInt(duration);
  let new_expired_date = organization.expired_date;

  if (parsedDuration && parsedDuration > 0) {
    // Хэрэв хугацаа нь дуусаагүй байвал одоо байгаа дээр нь нэмнэ, дууссан бол өнөөдрөөс
    const baseDate =
      organization.expired_date &&
      new Date(organization.expired_date) > new Date()
        ? new Date(organization.expired_date)
        : new Date();

    // Сар нэмэх функц (calculateNewExpiry байхгүй бол доорх байдлаар хийнэ)
    baseDate.setMonth(baseDate.getMonth() + parsedDuration);
    new_expired_date = baseDate;
  }

  // AI эрх нэмэх
  const additionalAI = Number(ai_analize_count) || 0;

  // Байгууллагын мэдээллийг шинэчлэх
  await organization.update({
    ai_analize_count: (organization.ai_analize_count || 0) + additionalAI,
    expired_date: new_expired_date,
    price_type: price_type || organization.price_type,
  });

  res.status(200).json({
    success: true,
    message: "Нэхэмжлэх төлөгдөж, эрх сунгагдлаа.",
    body: invoice, // Шинэчлэгдсэн нэхэмжлэх
  });
});
