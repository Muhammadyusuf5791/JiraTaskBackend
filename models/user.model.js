const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("Admin", "Developer", "Tester"),
        allowNull: false,
        defaultValue: "Developer",
      },
    },
    {
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
    }
  );

  User.beforeSave(async (user) => {
    if (user.changed("password")) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  });

  User.associate = (models) => {
    User.hasMany(models.Project, {
      foreignKey: "teamLeadId",
      as: "ledProjects",
      onDelete: "SET NULL",
    });
    User.hasMany(models.Task, {
      foreignKey: "assigneeId",
      as: "assignedTasks",
      onDelete: "SET NULL",
    });
    User.hasMany(models.Penalty, {
      foreignKey: "userId",
      as: "penalties",
      onDelete: "CASCADE",
    });
    User.hasMany(models.Comment, {
      foreignKey: "userId",
      as: "comments",
      onDelete: "CASCADE",
    });
    User.hasMany(models.Project, {
      foreignKey: "testerId",
      as: "testedProjects",
      onDelete: "SET NULL",
    });
    User.hasMany(models.Notification, {
      foreignKey: "userId",
      as: "notifications",
      onDelete: "CASCADE",
    });
  };

  return User;
};