const Sequelize = require("sequelize");

var db = {};

const sequelize = new Sequelize(
  process.env.SEQUELIZE_DATABASE,
  process.env.SEQUELIZE_USER,
  process.env.SEQUELIZE_USER_PASSWORD,
  {
    host: process.env.SEQUELIZE_HOST,
    port: process.env.SEQUELIZE_PORT,
    dialect: process.env.SEQUELIZE_DIALECT,
    define: {
      freezeTableName: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000,
    },

    operatorAliases: false,
  }
);

const models = [
  require("../models/users"),
  require("../models/organization"),
  require("../models/rating"),
  require("../models/invoice"),
  require("../models/merchant")
];

models.forEach((model) => {
  const seqModel = model(sequelize, Sequelize);
  console.log("==>", seqModel.name);
  db[seqModel.name] = seqModel;
});

db.sequelize = sequelize;

module.exports = db;
