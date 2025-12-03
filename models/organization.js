/* jshint indent: 1 */
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const cuid = require("cuid");
const jwt = require("jsonwebtoken");

module.exports = function (sequelize, DataTypes) {
  const Organization = sequelize.define(
    "organization",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      integrationId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: () => cuid(),
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      organization_register: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
      },
      // Organization Type Field Added
      organization_type: {
        type: DataTypes.ENUM("private", "government"),
        defaultValue: "private",
        allowNull: false,
      },

      // Type on BASIC PRO ENTERPRISE
      price_type: {
        type: DataTypes.ENUM("basic", "enterprise", "pro"),
        defaultValue: "basic",
        allowNull: false,
      },
      ai_analize_count: {
        type: DataTypes.INTEGER.UNSIGNED,
        defaultValue: 3,
        allowNull: false,
      },
      // Expiration Date Field Added
      expired_date: {
        type: DataTypes.DATE,
        allowNull: true, // Null for Government organizations
        defaultValue: DataTypes.NOW,
      },
      // Байгууллагын мэдээлэл
      business_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      business_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      business_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      business_phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      business_tax: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      linkedin: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      facebook: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      instagram: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      logoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      averageRating: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      totalRatings: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
      },
      resetPasswordExpire: {
        type: DataTypes.DATE,
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: "organization",
      timestamps: true,
    }
  );

  // Хадгалахаас өмнө password шифрлэх
  Organization.beforeCreate(async (orga) => {
    if (orga.password) {
      const salt = await bcrypt.genSalt(10);
      orga.password = await bcrypt.hash(orga.password, salt);
    }
  });

  Organization.beforeUpdate(async (orga) => {
    if (orga.changed("password")) {
      const salt = await bcrypt.genSalt(10);
      orga.password = await bcrypt.hash(orga.password, salt);
    }
  });

  // JWT үүсгэх
  Organization.prototype.getJsonWebToken = function () {
    const token = jwt.sign(
      {
        id: this.id,
        email: this.email,
        type: "organization",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d", // 1 өдөр хүчинтэй
      }
    );
    return token;
  };

  // Нууц үг шалгах
  Organization.prototype.CheckPass = async function (pass) {
    return await bcrypt.compare(pass, this.password);
  };

  // Password reset token үүсгэх
  Organization.prototype.generatePasswordChangeToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 минут
    return resetToken;
  };

  return Organization;
};
