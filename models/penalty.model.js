module.exports = (sequelize, DataTypes) => {
  const Penalty = sequelize.define(
    "Penalty",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      amount: {
        type: DataTypes.STRING, // Can be amount or type of penalty
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );

  Penalty.associate = (models) => {
    Penalty.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
    });
    Penalty.belongsTo(models.User, {
      foreignKey: "adminId",
      as: "admin",
      onDelete: "SET NULL",
    });
  };

  return Penalty;
};
