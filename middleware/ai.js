const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

/**
 * Сэтгэгдлийг засаж, эцсийн ганц текст буцаах
 * @param {string} userText - Фронтендээс ирж буй сэтгэгдэл
 * @returns {Promise<string>} - Эцсийн засварласан текст
 */
const MODEL = "gpt-5-mini";
exports.generateFinalText = async (userText) => {
  if (!userText) throw new Error("userText хоосон байна.");

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `Дараах сэтгэгдлийг ёс зүйг зөрчөөгүй, утга зүйн алдаагүй, цэвэр найруулгатай нэг эцсийн текст болгон зас.
Сөрөг үед хүний нэрийг ерөнхий нэршлээр соль.
Тайлбар бичихгүй, зөвхөн эцсийн текстийг буцаа.`,
      },
      { role: "user", content: userText },
    ],
  });

  return response.choices[0].message.content;
};

exports.generateRateAnalyze = async (ratings) => {
  if (!ratings || !ratings.length) return { advice: "Үнэлгээ байхгүй байна." };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const summaryText = ratings
    .map((r) => `Score: ${r.score}, Comment: ${r.comment}`)
    .join("\n");

  const prompt = `
Доорх байгууллагуудын үнэлгээ, сэтгэгдэлд үндэслэн нөхцөл байдлын дүгнэлт гарга. 
**Үр дүнг яг доорх JSON бүтэцтэйгээр буцаа (ямар ч нэмэлт текст, тайлбар, тэмдэг оруулахгүй):**

  {
    "organizationId": number,
    "organizationName": string,
    "summary": string,
    "averageScore": number,
    "totalRatings": number,
    "positiveComments": number,
    "negativeComments": number,
    "keyIssues": [string],
    "highPriority": [string]
     "topComments": [string]
  }
Мэдээлэл:
${summaryText}
`;

  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content:
          "Та байгууллагын үнэлгээний сэтгэгдлийг шинжилж зөвлөмж гаргана. JSON format-д буцаана.",
      },
      { role: "user", content: prompt },
    ],
  });

  const aiText = response.choices?.[0]?.message?.content || "";

  try {
    return JSON.parse(aiText);
  } catch (err) {
    // Хэрэв AI буруу format өгвөл raw текст буцаана
    return { advice: aiText || "AI дүгнэлт гаргах боломжгүй байна." };
  }
};
exports.analyzeOrganizations = async (orgs) => {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const allOrgsSummary = orgs
    .map((org) => {
      const commentsSummary = org.ratings.map((r) => r.comment).join("\n");
      return `
OrganizationId: ${org.id}
Name: ${org.business_name}
AverageScore: ${org.averageRating || 0}
TotalRatings: ${org.totalRatings || 0}
Comments:
${commentsSummary}
`;
    })
    .join("\n\n");

  const prompt = `
Доорх байгууллагуудын үнэлгээ, сэтгэгдэлд үндэслэн нөхцөл байдлын дүгнэлт гарга. 
**Үр дүнг яг доорх JSON бүтэцтэйгээр буцаа (ямар ч нэмэлт текст, тайлбар, тэмдэг оруулахгүй):**

[
  {
    "organizationId": number,
    "organizationName": string,
    "summary": string,
    "averageScore": number,
    "totalRatings": number,
    "positiveComments": number,
    "negativeComments": number,
    "keyIssues": [string],
    "highPriority": [string]
     "topComments": [string]
  }
]

Мэдээлэл:
${allOrgsSummary}
`;

  const response = await client.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "Та бүх байгууллагын нөхцөл байдлыг дүгнэнэ.",
      },
      { role: "user", content: prompt },
    ],
  });

  const aiText = response.choices?.[0]?.message?.content || "";

  try {
    return JSON.parse(aiText); // JSON array буцаана
  } catch (err) {
    // Хэрвээ AI буруу формат өгвөл raw текстээр summary буцаана
    return [{ summary: aiText }];
  }
};
