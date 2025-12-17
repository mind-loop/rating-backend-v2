const express = require("express");
const dotenv = require("dotenv");
var path = require("path");
const fileUpload = require("express-fileupload");
var rfs = require("rotating-file-stream");
const colors = require("colors");
const errorHandler = require("./middleware/error");
var morgan = require("morgan");
const logger = require("./middleware/logger");
// Router оруулж ирэх
const organizationRoutes = require("./routes/organization")
const successRoutes = require("./routes/success");
const userRoutes = require("./routes/users")
const feedbackRoutes = require("./routes/rating")
const OpenAiRoutes = require("./routes/openai.js")
const paymentRoutes = require("./routes/payment")
const dashboardRoutes = require("./routes/dashboard.js");
const merchantRoutes = require("./routes/merchant");
const injectDb = require("./middleware/injectDb");
const cors = require("cors");
// Аппын тохиргоог process.env рүү ачаалах
dotenv.config({ path: "./config/config.env" });

const db = require("./config/db-mysql");

const app = express();

// Body parser
app.use(express.json());
app.use(fileUpload());
app.use(cors());
app.use(logger);
app.use(injectDb(db));
app.use(express.static("public"));
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/organization", organizationRoutes);
app.use("/api/v1/rating", feedbackRoutes);
app.use("/api/v1/ai", OpenAiRoutes);

app.use("/api/v1/dashboard",dashboardRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/merchant", merchantRoutes);
app.use("/api/v1", successRoutes);
app.use(errorHandler);

// user to departments - one to many
db.organization.hasMany(db.ratings, { foreignkey: "organizationId", as: "ratings" });
db.ratings.belongsTo(db.organization, { foreignKey: "organizationId", as: "organization" });
// user to departments - one to many
db.organization.hasMany(db.invoice, { foreignkey: "organizationId", as: "invoices" });
db.invoice.belongsTo(db.organization, { foreignKey: "organizationId", as: "organization" });
// Sync models
db.sequelize
  .sync()
  .then((result) => {
    console.log("sync hiigdlee...");
  })
  .catch((err) => console.log(err));



const server = app.listen(
  process.env.PORT,
  console.log(`Express сэрвэр ${process.env.PORT} порт дээр аслаа... `.rainbow)
);

process.on("unhandledRejection", (err, promise) => {
  console.log(`Алдаа гарлаа : ${err.message}`.underline.red.bold);
  server.close(() => {
    process.exit(1);
  });
});
