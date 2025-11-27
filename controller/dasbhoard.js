export const getOverviewStats = async (req, res, next) => {
    try {
        // 1. Нийт хэрэглэгчдийн тоог татах
        const totalUsers = await req.db.users.countDocuments({});

        // 2. Нийт байгууллагын тоог татах
        const totalOrganizations = await req.db.organization.countDocuments({});

        // 3. Системийн Дундаж Үнэлгээг тооцох (MongoDB Aggregate ашиглан)
        const ratingStats = await req.db.ratings.aggregate([
            {
                $group: {
                    _id: null, // Бүх баримтуудыг нэг группт нэгтгэнэ
                    averageScore: { $avg: "$score" } // 'score' талбарын дундаж
                }
            }
        ]);
        const stats = {
            totalUsers,
            totalOrganizations,
            averageRatingOverall: parseFloat(averageRatingOverall.toFixed(2)), 
        };

        // Хариуг илгээх
        return res.status(200).json(stats);

    } catch (error) {
        // Алдаа гарвал дараагийн middleware-д дамжуулах
        next(error);
    }
};