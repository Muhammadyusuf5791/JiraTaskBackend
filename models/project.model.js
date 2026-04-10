module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define(
    "Project",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      teamLeadId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      testerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      websiteLink: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      githubRepoLink: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: true,
    }
  );

  Project.associate = (models) => {
    Project.belongsTo(models.User, {
      foreignKey: "teamLeadId",
      as: "teamLead",
      onDelete: "SET NULL",
    });
    Project.belongsTo(models.User, {
      foreignKey: "testerId",
      as: "tester",
      onDelete: "SET NULL",
    });
    Project.hasMany(models.Task, {
      foreignKey: "projectId",
      as: "tasks",
      onDelete: "CASCADE",
    });
  };

  return Project;
};
