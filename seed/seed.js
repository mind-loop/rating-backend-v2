const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
  try {
    const orgPath = path.join(__dirname, "data", "organizations.json");
    const ratingPath = path.join(__dirname, "data", "ratings.json");
    const organizations = JSON.parse(fs.readFileSync(orgPath, "utf-8"));
    const ratings = JSON.parse(fs.readFileSync(ratingPath, "utf-8"));
    await req.db.organization.bulkCreate(organizations);
    await req.db.ratings.bulkCreate(ratings);
    res.json({
      success: true,
      organizations: organizations.length,
      ratings: ratings.length
    });

  } catch (error) {
    console.error("❌ Seed error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
