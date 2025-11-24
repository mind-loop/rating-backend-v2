const dayjs = require("dayjs");
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { PaymentSell } = require("./constants");

dayjs.extend(utc);
dayjs.extend(timezone);

exports.generateLengthPass = (len) => {
    const number = Math.pow(10, len);
    return Math.floor((Math.random() * 9 * number) / 10) + number / 10 + "";
};

exports.generateLengthDate = (days) => {
    const futureDate = dayjs().add(days, 'day').tz("Asia/Ulaanbaatar").startOf("day");
    return futureDate.format("YYYY-MM-DD HH:mm:ss");
};

exports.generatePayment = (days, price) => {
    const sell = PaymentSell.find(sell => sell.exp_day == days)
    const amount = sell ? price - price * sell.process / 100 : price
    return { sell: sell.process, amount }
}


exports.emailTemplate = (message) => {
    return `<!DOCTYPE html>
  <html lang="mn">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Санал хүсэлтийн систем</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f6f8;
              margin: 0;
              padding: 30px;
          }
          .container {
              max-width: 700px;
              margin: auto;
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
              text-align: center;
              border-bottom: 2px solid #007BFF;
              padding-bottom: 10px;
              margin-bottom: 20px;
          }
          .header h1 {
              color: #007BFF;
              margin: 0;
          }
          .content {
              font-size: 16px;
              color: #333333;
              line-height: 1.6;
          }
          .content p {
              margin: 10px 0;
          }
          .footer {
              text-align: center;
              font-size: 0.9em;
              color: #888888;
              margin-top: 30px;
          }
          a.button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #007BFF;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 15px;
          }
          a.button:hover {
              background-color: #0056b3;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>Сайн байна уу?</h1>
          </div>
          <div class="content">
              <p><strong>Та "Санал хүсэлтийн систем"-д дараах мэдээллийг хүлээн авлаа:</strong></p>
              <p><strong>Гарчиг:</strong> ${message.title ? message.title : 'Гарчиг оруулаагүй байна'}</p>
              <p><strong>Тайлбар:</strong> ${message.label ? message.label : 'Тайлбар оруулаагүй байна'}</p>
              
              <p>
                  Системийн хаяг руу орохын тулд дараах холбоосыг дарна уу: <br>
                  <a class="button" href="${process.env.WEBSITE_URL}">Систем рүү очих</a>
              </p>

              <p>Танд баярлалаа. 🌟</p>
          </div>
          <div class="footer">
              <p><a href="${process.env.SPONSOR_COMPANY_URL}">${process.env.SPONSOR_COMPANY_URL}</a> &copy; ${new Date().getFullYear()} Бүх эрх хуулиар хамгаалагдсан.</p>
          </div>
      </div>
  </body>
  </html>`;
};


exports.calculateNewExpiry= (currentDate, duration) => {
    const newDate = new Date(currentDate);

    switch (duration) {
        case 1:
            newDate.setMonth(newDate.getMonth() + 1);
            break;
        case 3:
            newDate.setMonth(newDate.getMonth() + 3);
            break;
        case 6:
            newDate.setMonth(newDate.getMonth() + 6);
            break;
        case 12:
            newDate.setFullYear(newDate.getFullYear() + 1);
            break;
        default:
            // Default to 1 month if an invalid duration is provided
            newDate.setMonth(newDate.getMonth() + 1);
    }
    return newDate;
};

exports.parseAITextToJSON=(text)=> {
  const lines = text.split('\n');
  const result = [];
  let current = null;

  lines.forEach(line => {
    // Headings: 1. Яаралтай холбоо (Priority: High)
    const headingMatch = line.match(/^(\d+)\.\s(.+)\s\(Priority:\s(.+)\)/);
    if (headingMatch) {
      if (current) result.push(current);
      current = { title: headingMatch[2], priority: headingMatch[3], actions: [] };
    } else if (line.trim().startsWith('-') && current) {
      current.actions.push(line.trim().substring(2).trim());
    }
  });

  if (current) result.push(current);
  return result;
}