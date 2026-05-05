const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

// 1. Singleton Client: Холболтыг дахин ашиглаж, Timeout-оос сэргийлнэ
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000, // 45 секунд хүлээгээд хариу ирэхгүй бол цуцална
});

const MODEL = "gpt-4o-mini";

/**
 * Сэтгэгдлийг ёс зүйн дагуу засварлаж, хувь хүний нууцыг хамгаалах
 */
exports.generateFinalText = async (userText) => {
    if (!userText || userText.trim().length === 0) return "";

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
            {
                role: "system",
                content: `Та бол мэргэжлийн сэтгэгдэл хянагч. Таны зорилго бол бүдүүлэг сэтгэгдлийг соёлтой болгох, хүний нэрийг нууцлах юм.
                
                ДҮРЭМ:
                1. Хараал болон ёс бус үгсийг шууд устгаж, утгыг нь соёлтой шүүмжлэл болгох.
                2. Сэтгэгдэл сөрөг (муулсан, шүүмжилсэн) бол хүний нэрийг "ажилтан" эсвэл "алба хаагч" гэж заавал солих.
                3. Зөвхөн зассан текстийг буцаа.
                4. Хэрэв сэтгэгдэл зөвхөн эерэг (магтсан, талархсан) бол текстийг өөрчлөхгүйгээр буцаа.
                
                ЖИШЭЭ:
                - Input: "Танай ажилтан Батмөнх хог юм байна Пиздаа."
                - Output: "Танай ажилтан үүргээ хангалтгүй биелүүлж байна."
                
                - Input: "Энэ Долгор гэдэг хүн ёстой бүтэхгүй гөлөг байна."
                - Output: "Энэ ажилтан харилцааны соёлгүй байна."
                
                - Input: "Бат-Эрдэнэ ахдаа маш их баярлалаа, сайн тусаллаа."
                - Output: "Бат-Эрдэнэ ахдаа маш их баярлалаа, сайн тусаллаа."`
            },
            { role: "user", content: userText },
        ],
        temperature: 0.1, // Бүр багасгаж, AI-ийн "дураараа" байдлыг хаалаа
    });

    return response.choices[0].message.content.trim();
};

/**
 * Нэг байгууллагын үнэлгээг шинжлэх
 */
exports.generateRateAnalyze = async (ratings) => {
    if (!ratings || !ratings.length) return { advice: "Үнэлгээ байхгүй байна." };

    // Датаг товчилж token хэмнэнэ (S: оноо, C: сэтгэгдэл)
    const summaryText = ratings
        .map((r) => `S:${r.score}, C:${r.comment}`)
        .join("\n");

    const prompt = `
Та бол байгууллагын стратеги төлөвлөлтийн зөвлөх, ахлах бизнес аналитикч хүн. 
Доорх өгөгдөлд (S: оноо, C: сэтгэгдэл) үндэслэн гүйцэтгэх удирдлагын багт зориулсан стратеги шинжилгээний тайлан гарга.

**Шинжилгээ хийхдээ дараах зүйлсийг анхаар:**
1. **summary**: Удирдлагын хураангуй (Executive Summary). Үйлчилгээний ерөнхий соёл, чиг хандлага, давуу тал болон алдагдаж буй боломжуудыг мэргэжлийн хэллэгээр тайлбарлах.
2. **keyIssues**: Хэрэглэгчдийн сэтгэл ханамжид хамгийн их сөргөөр нөлөөлж буй "системийн шинжтэй" гол асуудлууд (Pain points).
3. **highPriority**: Нэн даруй анхаарал хандуулах шаардлагатай, эрсдэл дагуулж буй цэгүүд.
4. **proposedActions**: Оновчтой, бодитой хэрэгжүүлж болох 3-5 ажил (Жишээ нь: Процесс сайжруулах, дотоод сургалт орох, технологийн шинэчлэл хийх).
5. **customerSentimentScore**: Хэрэглэгчийн сэтгэл хөдлөлийн индекс (0-100%). Энэ нь сэтгэгдлүүдийн агуулгад дүн шинжилгээ хийсэн хандлагын үзүүлэлт юм.
6. **topComments**: Байгууллагын дүр төрхийг хамгийн сайн тодорхойлох 3-5 чухал сэтгэгдэл.

**Өгөгдөл:**
${summaryText}

**JSON бүтэц:**
{
  "organizationId": number,
  "organizationName": "string",
  "summary": "string", 
  "averageScore": number,
  "totalRatings": number,
  "positiveComments": number,
  "negativeComments": number,
  "customerSentimentScore": "0-100%", 
  "keyIssues": ["string"],
  "highPriority": ["string"],
  "proposedActions": ["string"],
  "topComments": ["string"]
}

**Дүрмүүд:**
- Зөвхөн JSON буцаа. Нэмэлт тайлбар, тэмдэгт оруулахгүй.
- Сөрөг сэтгэгдэл дээрх хүний нэрийг 'ажилтан' эсвэл 'алба хаагч' гэж ерөнхийлөх.
- Дүгнэлтүүд нь маш ажил хэрэгч, шийдвэр гаргахад чиглэсэн байх.
`;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini", // Хурдан бөгөөд ухаалаг
            response_format: { type: "json_object" },
            temperature: 0, // Хариуг илүү тогтвортой, үнэн зөв болгоно
            messages: [
                {
                    role: "system",
                    content: "Та бол өгөгдсөн JSON бүтцийн дагуу үр дүнг гаргадаг дата аналитикч.",
                },
                { role: "user", content: prompt },
            ],
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // Хэрэв зарим талбар дутуу ирвэл алдаа гарахаас сэргийлж default утга оноох
        return {
            organizationId: result.organizationId || 0,
            organizationName: result.organizationName || "",
            summary: result.summary || "",
            averageScore: result.averageScore || 0,
            totalRatings: ratings.length,
            positiveComments: result.positiveComments || 0,
            negativeComments: result.negativeComments || 0,
            keyIssues: result.keyIssues || [],
            highPriority: result.highPriority || [],
            topComments: result.topComments || [],
            proposedActions: result.proposedActions || [],
            customerSentimentScore: result.customerSentimentScore || "0%",

        };
    } catch (err) {
        console.error("AI Error:", err);
        throw new Error("AI анализ хийхэд алдаа гарлаа: " + err.message);
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
/**
 * Олон байгууллагыг нэгтгэж, нэг хүсэлтээр шинжлэх (Optimized Batch Mode)
 */
exports.analyzeOrganizationsBatch = async (orgs) => {
    if (!orgs || orgs.length === 0) return [];

    const orgsWithRatings = orgs.filter(org => org.ratings && org.ratings.length > 0);
    const orgsWithoutRatings = orgs.filter(org => !org.ratings || org.ratings.length === 0);

    const emptyResults = orgsWithoutRatings.map(org => ({
        organizationId: org.id,
        organizationName: org.business_name,
        summary: "Энэ хугацаанд үнэлгээ бүртгэгдээгүй байна.",
        averageScore: 0,
        totalRatings: 0,
        customerSentimentScore: "0%",
        keyIssues: [],
        proposedActions: ["Үйлчлүүлэгчдийг үнэлгээ өгөхийг уриалах"]
    }));

    if (orgsWithRatings.length === 0) return emptyResults;

    const allOrgsData = orgsWithRatings.map(org => {
        const ratingsSummary = org.ratings
            .map(r => `S:${r.score}, C:${r.comment || 'N/A'}`)
            .join(" | ");
        return `ID:${org.id}, Name:${org.business_name}, Data:[${ratingsSummary}]`;
    }).join("\n---\n");

    const prompt = `
Та бол ахлах аналитикч. Өгөгдсөн байгууллагуудын үнэлгээг шинжилж, тус бүрт нь стратеги дүгнэлт гарга.
Хариуг заавал "results" гэсэн түлхүүр үгтэй JSON объект дотор массив хэлбэрээр ирүүл.

**Өгөгдөл:**
${allOrgsData}

**Хүлээгдэж буй JSON бүтэц:**
{
  "results": [
    {
      "organizationId": number,
      "organizationName": "string",
      "summary": "string",
      "averageScore": number,
      "totalRatings": number,
      "customerSentimentScore": "0-100%",
      "keyIssues": ["string"],
      "proposedActions": ["string"]
    }
  ]
}
`;

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            response_format: { type: "json_object" }, // Энэ нь заавал {} байхыг шаардана
            temperature: 0,
            messages: [
                { role: "system", content: "Та өгөгдсөн бүтцээр зөвхөн JSON буцаадаг аналитикч." },
                { role: "user", content: prompt }
            ],
        });

        const content = response.choices[0].message.content;
        const parsed = JSON.parse(content);
        
        // AI-аас ирсэн "results" массивыг авах
        const aiResults = parsed.results || [];

        return [...aiResults, ...emptyResults];
    } catch (err) {
        console.error("Batch Analysis Error:", err);
        return emptyResults; // Алдаа гарвал хоосон үр дүнгүүдээ л буцаана
    }
};