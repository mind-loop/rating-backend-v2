/* jshint indent: 1 */
module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "invoice",
    {
      id: {
        type: DataTypes.INTEGER(10).UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      invoice_id: {
        type: DataTypes.STRING,
      },
      uniq_generate_id: {
        type: DataTypes.STRING,
      },
      callback_url: {
        type: DataTypes.STRING,
      },
      payment_type: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "pending",
      },
      sell: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Захиалгын дүн хоосон байна!!!",
          },
        },
      },
      bank_qr_code: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Таны QR байхгүй байна!!!",
          },
        },
      },
    },
    {
      tableName: "invoice",
      timestamps: true,
    }
  );
};
