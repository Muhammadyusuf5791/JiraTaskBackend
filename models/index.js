const Sequelize = require("sequelize");
const sequelize = require("../config/database");
const User = require("./user.model")(sequelize, Sequelize);
const Project = require("./project.model")(sequelize, Sequelize);
const Task = require("./task.model")(sequelize, Sequelize);
const Penalty = require("./penalty.model")(sequelize, Sequelize);
const Comment = require("./comment.model")(sequelize, Sequelize);
const Notification = require("./notification.model")(sequelize, Sequelize);

const models = { User, Project, Task, Penalty, Comment, Notification };

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = { User, Project, Task, Penalty, Comment, Notification, sequelize };
