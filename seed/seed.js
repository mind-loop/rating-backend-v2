const fs = require("fs");
const path = require("path");

// req, res-ээс хамааралгүй болгох
const runSeed = async (db) => {
  try {
    const orgPath = path.join(__dirname, "data", "organizations.json");
    const ratingPath = path.join(__dirname, "data", "ratings.json");
    
    const organizations = JSON.parse(fs.readFileSync(orgPath, "utf-8"));
    const ratings = JSON.parse(fs.readFileSync(ratingPath, "utf-8"));

    await db.organization.bulkCreate(organizations);
    await db.ratings.bulkCreate(ratings);

    console.log("✅ Seed success:", organizations.length, ratings.length);
  } catch (error) {
    console.error("❌ Seed error:", error.message);
  }
};

module.exports = runSeed;