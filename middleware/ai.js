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
 * @param {Array} ratings — score, comment талбар бүхий үнэлгээний массив
 * @param {string|null} purpose — шинжилгээний зорилго/контекст (заавал биш)
 */
exports.generateRateAnalyze = async (ratings, purpose = null) => {
    if (!ratings || !ratings.length) return { advice: "Үнэлгээ байхгүй байна." };

    // Датаг товчилж token хэмнэнэ (S: оноо, C: сэтгэгдэл)
    const summaryText = ratings
        .map((r) => `S:${r.score}, C:${r.comment}`)
        .join("\n");

    const purposeSection = purpose
        ? `\n**Боловсруулах зорилго / Контекст:**\n${purpose}\n\nДээрх зорилгыг голлон харгалзаж, тусгайлсан, нарийн, шийдвэр гаргахад шууд ашиглагдахуйц зөвлөмж гарга.\n`
        : "";

    const prompt = `
Та бол байгууллагын стратеги төлөвлөлтийн зөвлөх, ахлах бизнес аналитикч юм.
Доорх өгөгдөлд (S: оноо 1-5, C: хэрэглэгчийн сэтгэгдэл) үндэслэн гүйцэтгэх удирдлагад зориулсан БОДИТ стратеги шинжилгээний тайлан гарга.
${purposeSection}
**Тайлан гаргахдаа ЗААВАЛ дараах шаардлагыг биелүүл:**

1. **summary** — Гүйцэтгэх удирдлагын хураангуй (3-5 өгүүлбэр):
   - Үйлчилгээний ерөнхий чанар, давуу болон сул тал
   - Тоон үзүүлэлтэд тулгуурлах (жишээ: "Нийт сэтгэгдлийн 60% нь...")
   - Зах зээлийн байршилд нөлөөлөх хүчин зүйлсийг дурдах

2. **keyIssues** — Системийн шинжтэй, давтагдан гарч буй гол асуудлууд (3-5):
   - Тодорхой өгөгдөлд тулгуурласан байх
   - Ерөнхий биш, тухайн байгууллагад хамааралтай байх
   - Үндсэн шалтгааныг (root cause) тодорхойлох

3. **highPriority** — Нэн даруй арга хэмжээ авах шаардлагатай эрсдэлт цэгүүд (2-3):
   - Хойшлуулбал учруулах хохирлыг дурдах
   - Конкрет, шууд хэрэгжүүлэх боломжтой байх

4. **proposedActions** — Бодитой, хугацаатай 3-5 арга хэмжээ:
   - "Юу хийх" + "Хэрхэн хийх" + "Хүлээгдэх үр дүн" бүтэцтэй байх
   - Богино хугацааны (7-30 хоног) болон дунд хугацааны (1-3 сар) гэж ялгах

5. **customerSentimentScore** — Сэтгэл ханамжийн нэгдсэн индекс (0-100%):
   - Зөвхөн оноогоор биш, сэтгэгдлийн агуулгыг дүн шинжилгээнд оруулах
   - Нейтрал сэтгэгдлийг бодитоор тооцох

6. **topComments** — Байгууллагын цаашдын шийдвэрт хамгийн чухал 3-5 сэтгэгдэл:
   - Эерэг болон сөрөг аль алиныг оруулах
   - Хамгийн их давтагддаг санааг илэрхийлэх сэтгэгдлийг сонгох

**Өгөгдөл (S=оноо, C=сэтгэгдэл):**
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
 * @param {Array} orgs — байгууллагуудын массив (ratings оруулаад)
 * @param {string|null} purpose — шинжилгээний зорилго/контекст (заавал биш)
 */
exports.analyzeOrganizationsBatch = async (orgs, purpose = null) => {
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

    const purposeSection = purpose
        ? `\n**Боловсруулах зорилго / Контекст:**\n${purpose}\n\nДээрх зорилгыг голлон харгалзаж, тусгайлсан, нарийн, шийдвэр гаргахад шууд ашиглагдахуйц зөвлөмж гарга.\n`
        : "";

    const prompt = `
Та бол байгууллагын стратеги төлөвлөлтийн зөвлөх, ахлах бизнес аналитикч юм.
Өгөгдсөн байгууллагуудын үнэлгээг шинжилж, ТУС БҮРТ нь гүйцэтгэх удирдлагад зориулсан БОДИТ стратеги дүгнэлт гарга.
Хариуг заавал "results" гэсэн түлхүүр үгтэй JSON объект дотор массив хэлбэрээр ирүүл.
${purposeSection}
**Тус бүрд нь дараах шаардлагыг биелүүл:**

1. **summary** — 3-5 өгүүлбэрийн хураангуй:
   - Тоон үзүүлэлтэд тулгуурлах (жишээ: "Үнэлгээний 70% нь...")
   - Байгууллагын гол давуу болон сул талыг тодорхойлох
   - Зах зээлд байгаа байршилд нөлөөлөх хүчин зүйлсийг дурдах

2. **keyIssues** — 3-5 системийн шинжтэй асуудал:
   - Давтагдан гарч буй бодит дуусгавар тодорхой байх
   - Үндсэн шалтгааныг (root cause) тодорхойлох
   - Ерөнхий биш, тухайн байгууллагад хамааралтай байх

3. **highPriority** — 2-3 нэн даруй анхаарах эрсдэлт цэг:
   - Хойшлуулбал учруулах хохирлыг товч дурдах
   - Шууд хэрэгжүүлэх боломжтой байх

4. **proposedActions** — 3-5 бодитой арга хэмжээ:
   - "Юу хийх + Хэрхэн хийх + Хүлээгдэх үр дүн" бүтэцтэй байх
   - Богино хугацааны (7-30 хоног) болон дунд хугацааны (1-3 сар) гэж ялгах

5. **customerSentimentScore** — Сэтгэл ханамжийн индекс ("0-100%" хэлбэртэй):
   - Зөвхөн оноо биш, сэтгэгдлийн агуулгыг дүн шинжилгээнд оруулах

6. **topComments** — Шийдвэрт хамгийн чухал 3-5 сэтгэгдэл:
   - Эерэг болон сөрөг аль алиныг оруулах

**Өгөгдөл (ID:байгууллагын ID, Name:нэр, Data:[S=оноо, C=сэтгэгдэл]):**
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
      "highPriority": ["string"],
      "proposedActions": ["string"],
      "topComments": ["string"]
    }
  ]
}

**Дүрмүүд:**
- Зөвхөн JSON буцаа. Нэмэлт тайлбар, markdown тэмдэгт оруулахгүй.
- Сөрөг сэтгэгдэл дэх хүний нэрийг "ажилтан" эсвэл "алба хаагч" гэж ерөнхийлөх.
- Дүгнэлтүүд нь маш ажил хэрэгч, шийдвэр гаргахад чиглэсэн байх.
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
        return emptyResults;
    }
};

/**
 * Арга хэмжээний сэтгэгдлийг шинжлэх — event-д тусгайлсан prompt
 * topComments: эерэг сэтгэгдлийг голлоно
 * negativeWarnings: сөрөг дохиог анхааруулга болгон гаргана
 */
exports.generateEventAnalyze = async (ratings, purpose = null) => {
    if (!ratings || !ratings.length) return { advice: "Сэтгэгдэл байхгүй байна." };

    const summaryText = ratings
        .map((r) => `S:${r.score}, C:${r.comment || "N/A"}`)
        .join("\n");

    const purposeSection = purpose
        ? `\n**Боловсруулах зорилго / Контекст:**\n${purpose}\n\nДээрх зорилгыг голлон харгалзаж, тусгайлсан, нарийн, шийдвэр гаргахад шууд ашиглагдахуйц зөвлөмж гарга.\n`
        : "";

    const prompt = `
Та бол арга хэмжээний үнэлгээг дүгнэдэг ахлах аналитикч юм.
Доорх арга хэмжээний сэтгэгдлүүдэд (S: оноо 1-5, C: сэтгэгдэл) дүн шинжилгээ хийж, зохион байгуулагчдад зориулсан тайлан гарга.
${purposeSection}
**ЗААВАЛ биелүүлэх шаардлагууд:**

1. **summary** — 3-5 өгүүлбэрийн хураангуй:
   - Арга хэмжээний ерөнхий амжилт, оролцогчдын хандлага
   - Тоон үзүүлэлтэд тулгуурлах (жишээ: "Оролцогчдын 75% нь...")
   - Цаашдын арга хэмжээнд ашиглах гол дүгнэлт

2. **keyIssues** — Арга хэмжээний зохион байгуулалтын системийн шинжтэй 3-5 сул тал:
   - Давтагдан гарч буй гомдол, хүсэлт
   - Үндсэн шалтгааныг тодорхойлох

3. **highPriority** — Дараагийн арга хэмжээнд заавал сайжруулах 2-3 цэг:
   - Хойшлуулбал оролцогчдын итгэлд хохирол учруулах зүйлс
   - Тодорхой, хэрэгжүүлэх боломжтой байх

4. **proposedActions** — Дараагийн арга хэмжээнд нэвтрүүлэх 3-5 арга хэмжээ:
   - "Юу хийх + Хэрхэн хийх + Хүлээгдэх үр дүн" бүтэцтэй байх

5. **customerSentimentScore** — Оролцогчдын нийт сэтгэл ханамжийн индекс ("0-100%" хэлбэртэй):
   - Оноо болон сэтгэгдлийн агуулга аль алиныг дүн шинжилгээнд оруулах

6. **topComments** — Арга хэмжээний амжилтыг харуулах ЭЕРЭГ сэтгэгдлүүд (3-5):
   - ЗӨВХӨН эерэг, талархалтай, урамшуулалтай сэтгэгдлийг оруулах
   - Зохион байгуулагчдын ажлыг тодорхойлсон, оролцогчид хэлсэн шилдэг үгсийг сонгох
   - Хэрэв эерэг сэтгэгдэл байхгүй бол хоосон массив буцаах

7. **negativeWarnings** — Анхааруулах СӨРӨГ дохиолол (2-4):
   - Хамгийн олон давтагдсан буюу хамгийн хурц сөрөг сэтгэгдлийн мөн чанарыг гаргах
   - Тодорхой асуудлыг нэрлэх (жишээ: "Хоолны чанарт олон гомдол ирсэн", "Дуу чимэгний тоног төхөөрөмж хангалтгүй байсан")
   - Хэрэв сөрөг сэтгэгдэл байхгүй бол хоосон массив буцаах

**Өгөгдөл (S=оноо, C=сэтгэгдэл):**
${summaryText}

**JSON бүтэц:**
{
  "summary": "string",
  "averageScore": number,
  "totalRatings": number,
  "positiveComments": number,
  "negativeComments": number,
  "customerSentimentScore": "0-100%",
  "keyIssues": ["string"],
  "highPriority": ["string"],
  "proposedActions": ["string"],
  "topComments": ["ЗӨВХӨН эерэг сэтгэгдлүүд"],
  "negativeWarnings": ["Анхааруулах сөрөг дохиолол"]
}

**Дүрмүүд:**
- Зөвхөн JSON буцаа. Нэмэлт тайлбар, markdown тэмдэгт оруулахгүй.
- Сөрөг сэтгэгдэл дэх хүний нэрийг "зохион байгуулагч" эсвэл "ажилтан" гэж ерөнхийлөх.
- topComments дотор ХЭЗЭЭ Ч сөрөг агуулга оруулахгүй.
- negativeWarnings нь конкрет, тодорхой асуудал байх ёстой, ерөнхий биш.
`;

    try {
        const response = await client.chat.completions.create({
            model: MODEL,
            response_format: { type: "json_object" },
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: "Та өгөгдсөн JSON бүтцийн дагуу зөвхөн JSON буцаадаг арга хэмжээний аналитикч.",
                },
                { role: "user", content: prompt },
            ],
        });

        const result = JSON.parse(response.choices[0].message.content);
        return {
            summary: result.summary || "",
            averageScore: result.averageScore || 0,
            totalRatings: ratings.length,
            positiveComments: result.positiveComments || 0,
            negativeComments: result.negativeComments || 0,
            customerSentimentScore: result.customerSentimentScore || "0%",
            keyIssues: result.keyIssues || [],
            highPriority: result.highPriority || [],
            proposedActions: result.proposedActions || [],
            topComments: result.topComments || [],
            negativeWarnings: result.negativeWarnings || [],
        };
    } catch (err) {
        console.error("Event AI Error:", err);
        throw new Error("AI арга хэмжээний анализ хийхэд алдаа гарлаа: " + err.message);
    }
};