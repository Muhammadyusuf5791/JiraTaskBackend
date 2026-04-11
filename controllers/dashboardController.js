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

exports.getTesterStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get projects assigned to this tester
    const assignedProjects = await Project.findAll({
      where: { testerId: userId },
      attributes: ['id']
    });
    const projectIds = assignedProjects.map(p => p.id);

    // Pending review
    const pendingReview = await Task.count({
      where: {
        projectId: projectIds,
        status: 'IN_REVIEW'
      }
    });

    // Total Reviewed (DONE status)
    const totalReviewed = await Task.count({
      where: {
        projectId: projectIds,
        status: 'DONE'
      }
    });

    // Recently Reviewed (DONE status updated today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewedToday = await Task.count({
      where: {
        projectId: projectIds,
        status: 'DONE',
        updatedAt: { [Op.gte]: today }
      }
    });

    // Penalties for the tester themselves
    const myPenalties = await Penalty.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).send({
      pendingReview,
      totalReviewed,
      reviewedToday,
      myPenalties
    });
  } catch (error) {
    console.error("getTesterStats error:", error);
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getDeveloperStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Task counts by status
    const stats = await Task.findAll({
      where: { assigneeId: userId },
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
    });

    const statusCounts = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0
    };

    stats.forEach(s => {
      statusCounts[s.status] = parseInt(s.get("count"));
    });

    // Done Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const doneToday = await Task.count({
      where: {
        assigneeId: userId,
        status: 'DONE',
        updatedAt: { [Op.gte]: today }
      }
    });

    // Penalties
    const penalties = await Penalty.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    const totalPenalties = penalties.reduce((acc, p) => acc + Number(p.amount), 0);

    res.status(200).send({
      ...statusCounts,
      doneToday,
      penalties,
      totalPenalties
    });
  } catch (error) {
    console.error("getDeveloperStats error:", error);
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
