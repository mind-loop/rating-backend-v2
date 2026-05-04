const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

// 1. Singleton Client: Холболтыг дахин ашиглаж, Timeout-оос сэргийлнэ
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000, // 45 секунд хүлээгээд хариу ирэхгүй бол цуцална
});

const MODEL = "gpt-5-mini";

/**
 * Сэтгэгдлийг засаж, эцсийн ганц текст буцаах
 */
exports.generateFinalText = async (userText) => {
    if (!userText) throw new Error("userText хоосон байна.");

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: "system",
                content: `Дараах сэтгэгдлийг ёс зүйг зөрчөөгүй, утга зүйн алдаагүй, цэвэр найруулгатай нэг эцсийн текст болгон зас.
Сөрөг эсвэл шүүмжлэлтэй үед тухайн алба хаагч буюу хүний нэрийг ерөнхий нэршлээр (жишээ нь: ажилтан, алба хаагч) сольж нууцална уу.
Харин эерэг, талархлын сэтгэгдэл дээрх хүний нэрийг хэвээр үлдээж болно.
Тайлбар бичихгүй, зөвхөн эцсийн текстийг буцаа.`,
            },
            { role: "user", content: userText },
        ],
    });

    return response.choices[0].message.content;
};

/**
 * Нэг байгууллагын үнэлгээг шинжлэх
 */
exports.generateRateAnalyze = async (ratings) => {
    if (!ratings || !ratings.length) return { advice: "Үнэлгээ байхгүй байна." };

    const summaryText = ratings
        .slice(0, 30) // Timeout-оос сэргийлж хамгийн сүүлийн 30 сэтгэгдлийг авна
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
    "highPriority": [string],
    "topComments": [string]
  }

*Анхаар: Шүүмжлэлтэй сэтгэгдэл дээрх алба хаагчдын нэрийг 'ажилтан' эсвэл 'алба хаагч' гэж ерөнхийлж оруулна уу. Эерэг сэтгэгдэл дээрх нэрийг хэвээр үлдээж болно.
Мэдээлэл:
${summaryText}
`;

    const response = await client.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" }, // JSON Mode идэвхжүүлэв
        messages: [
            {
                role: "system",
                content: "Та байгууллагын үнэлгээний сэтгэгдлийг шинжилж зөвлөмж гаргана. JSON format-д буцаана.",
            },
            { role: "user", content: prompt },
        ],
    });

    const aiText = response.choices?.[0]?.message?.content || "";

    try {
        return JSON.parse(aiText);
    } catch (err) {
        return { advice: aiText || "AI дүгнэлт гаргах боломжгүй байна." };
    }
};

/**
 * Олон байгууллагыг Параллель байдлаар шинжлэх (Batching)
 */
exports.analyzeOrganizations = async (orgs) => {
    // Timeout-оос сэргийлэх хамгийн найдвартай арга бол Promise.all ашиглах юм.
    try {
        const tasks = orgs.map(async (org) => {
            const analysis = await this.generateRateAnalyze(org.ratings || []);
            return {
                ...analysis,
                organizationId: org.id,
                organizationName: org.business_name
            };
        });

        // Бүх байгууллагын хүсэлтийг зэрэг явуулна (Хурд нэмнэ)
        return await Promise.all(tasks);
    } catch (err) {
        console.error("Алдаа гарлаа:", err);
        return [{ error: "Боловсруулалтад алдаа гарлаа" }];
    }
};