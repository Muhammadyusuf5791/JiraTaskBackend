const { User, Project, Task, Penalty, sequelize } = require("../models");
const { Op } = require("sequelize");

exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalProjects = await Project.count();
    const totalTasks = await Task.count();

    const tasksByStatus = await Task.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
    });

    const delayedTasks = await Task.count({
      where: {
        deadline: { [Op.lt]: new Date() },
        status: { [Op.ne]: "DONE" }
      }
    });

    res.status(200).send({
      totalUsers,
      totalProjects,
      totalTasks,
      tasksByStatus,
      delayedTasks
    });
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Task, as: "assignedTasks" },
        { model: Project, as: "ledProjects" },
        { model: Penalty, as: "penalties", attributes: ["reason", "amount", "date"] }
      ]
    });

    if (!user) return res.status(404).send({ message: "Foydalanuvchi topilmadi" });

    res.status(200).send(user);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};
