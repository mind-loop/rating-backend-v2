const asyncHandler = require("../middleware/asyncHandle");
const axios = require("axios");
const MyError = require("../utils/myError");
const base64 = require("buffer").Buffer;
const dotenv = require("dotenv");
const exp = require("constants");
const cuid = require("cuid");
const { generatePayment } = require("../utils/common");
const paginate = require("../utils/paginate-sequelize");
dotenv.config({ path: "./config/config.env" });
const username = process.env.QPAY_USERNAME;
const password = process.env.QPAY_PASSWORD;
const INVOICE_CODE = process.env.INVOICE_CODE;
const SENDER_INVOICE_NO = "1234657";
const SENDER_BRANCH_CODE = "SALBAR1";
const QPAY_CALL_BACK_URL = process.env.QPAY_CALL_BACK_URL;

const getToken = async (merchant_username = username, merchantpassword = password) => {
  const response = await axios.post(
    (process.env.QPAY_BASEURL || "https://merchant.qpay.mn") + "/auth/token",
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " + base64.from(`${merchant_username}:${merchantpassword}`).toString("base64"),
      },
    }
  );
  if (!response) {
    throw new MyError(`Хүсэлт амжилтгүй ..`, 400);
  }
  return response.data.access_token;
};
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const invoice = await req.db.invoice.findOne({
    where: {
      id,
    },
  });
  if (!invoice) {
    throw new MyError(
      `Таны устгах гэсэн ${id} дугаартай мэдээлэл олдсонгүй`,
      404
    );
  }
  await invoice.destroy();

  res.status(200).json({
    message: "Invoice Deleted",
    body: { success: true },
  });
});
// new invoice organization expire
exports.newExpireOrganizationInvoiceQpay = asyncHandler(async (req, res, next) => {
  const merchant = await req.db.merchant.findOne({
    where: {
      is_active: true
    }
  })
  const token = await (merchant ? getToken(merchant.username, merchant.password) : getToken());

  const { duration, integrationId, amount, price_type = 'basic',ai_analize_count, organizationId } = req.body;
  if (!duration || !integrationId || !price_type || !ai_analize_count || !organizationId) {
    throw new MyError("Мэдээлэлээ бүрэн дамжуулна уу", 400);
  }
  if (!token) {
    throw new MyError(`Токен байхгүй байна ..`, 400);
  }
  const uniq_generate_id = "organization_" + integrationId;
  const callback_url = QPAY_CALL_BACK_URL+`/${organizationId}/extend-expiry?duration=${duration}&integrationId=${integrationId}&price_type=${price_type}&uniq_generate_id=${uniq_generate_id}&ai_analize_count=${ai_analize_count}`;
  const new_invoice = await axios.post(
    (process.env.QPAY_BASEURL || "https://merchant.qpay.mn") + "/invoice",
    {
      invoice_code: merchant?merchant.invoice_code : INVOICE_CODE,
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
    uniq_generate_id
  });
  if (!invoice_res) {
    throw new MyError(`invoice үүссэнгүй байна ..`, 400);
  }
  res.status(200).json({
    message: "QPAY.",
    body: new_invoice.data,
  });
});

// new invoice ai coupon
exports.newInvoiceAiAnaliticsCouponInvoiceQpay=asyncHandler(async(req,res,next)=>{
const merchant = await req.db.merchant.findOne({
    where: {
      is_active: true
    }
  })
  const token = await (merchant ? getToken(merchant.username, merchant.password) : getToken());

  const { integrationId, amount, ai_analize_count,organizationId } = req.body;
  if (!integrationId  || !ai_analize_count || !amount || !organizationId) {
    throw new MyError("Мэдээлэлээ бүрэн дамжуулна уу", 400);
  }
  if (!token) {
    throw new MyError(`Токен байхгүй байна ..`, 400);
  }
  const uniq_generate_id = "analytics_ai_coupon_" + integrationId;
  const callback_url = QPAY_CALL_BACK_URL+`/${organizationId}/ai-analitics?integrationId=${integrationId}&uniq_generate_id=${uniq_generate_id}&ai_analize_count=${ai_analize_count}`;
  const new_invoice = await axios.post(
    (process.env.QPAY_BASEURL || "https://merchant.qpay.mn") + "/invoice",
    {
      invoice_code: merchant?merchant.invoice_code : INVOICE_CODE,
      sender_invoice_no: SENDER_INVOICE_NO,
      invoice_receiver_code: "terminal",
      invoice_description: `AI Analitics Эрх: ${ai_analize_count} удаа`,
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
    uniq_generate_id
  });
  if (!invoice_res) {
    throw new MyError(`invoice үүссэнгүй байна ..`, 400);
  }
  res.status(200).json({
    message: "QPAY.",
    body: new_invoice.data,
  });
})
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
})