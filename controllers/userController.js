const { User, Task, Penalty, Notification, Project, sequelize } = require("../models");
const { validateUser, validateUpdateUser } = require("../validation/userValidaton");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

exports.createUser = async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const user = await User.create(req.body);

    const token = jwt.sign(
      { id: user.id, phone: user.phone, fullName: user.fullName, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const userData = user.toJSON();
    delete userData.password;
    res.status(201).send({ user: userData, token });
  } catch (err) {
    console.error("Backend xatolik:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "Bu telefon raqami allaqachon mavjud" });
    }

    res.status(500).send({ message: "Serverda xatolik" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'fullName', 'phone', 'role', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).send({ message: "Foydalanuvchi topilmadi." });
    }

    res.status(200).send(user);

  } catch (error) {
    console.error("Foydalanuvchi ma'lumotlarini olishda xatolik:", error);
    res.status(500).send({ message: "Serverda ichki xatolik yuz berdi." });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {});
    if (!user) return res.status(404).send("User not found");
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.updateUser = async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).send("User not found");
    await user.update(req.body);
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).send("User not found");

    const userData = user.toJSON();

    await user.destroy();
    res.status(200).send(userData);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.searchUsers = async (req, res) => {
  try {
    console.log("Query received:", req.query.query);

    const { query } = req.query;
    if (!query) {
      return res.status(400).send("Search query is required");
    }

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { fullName: { [Op.iLike]: `%${query}%` } },
          { phone: { [Op.iLike]: `%${query}%` } },
        ],
      },
    });

    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

exports.loginUser = async (req, res) => {
  const { phone, password } = req.body;

  try {
    const user = await User.scope(null).findOne({ where: { phone } });
    if (!user) return res.status(400).send({ message: "Telefon raqami noto'g'ri!" });

    // Hozir user.password mavjud
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send({ message: "Parol noto'g'ri!" });

    const token = jwt.sign(
      { id: user.id, phone: user.phone, fullName: user.fullName, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "10h" } // Login tokenini 10 soat qilamiz
    );

    const userData = user.toJSON();
    delete userData.password;

    res.status(200).send({
      message: "Login muvaffaqiyatli",
      token,
      user: userData,
    });
  } catch (error) {
    res.status(500).send({ message: "Server xatosi" });
  }
};

exports.getMobileDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Initialize all stats with 0
    const stats = {
      pendingTasks: 0,
      inReview: 0,
      doneTasks: 0,
      overdueTasks: 0,
      penalties: 0,
      totalPenaltyAmount: 0,
      totalProjects: 0,
      totalUsers: 0
    };

    // 1. Task Stats
    try {
      if (userRole === 'Admin') {
        stats.pendingTasks = await Task.count({ where: { status: ['TODO', 'IN_PROGRESS'], isArchived: { [Op.ne]: true } } });
        stats.inReview = await Task.count({ where: { status: 'IN_REVIEW', isArchived: { [Op.ne]: true } } });
        stats.doneTasks = await Task.count({ where: { status: 'DONE', isArchived: { [Op.ne]: true } } });
        stats.overdueTasks = await Task.count({
          where: { status: { [Op.ne]: 'DONE' }, deadline: { [Op.lt]: new Date() }, isArchived: { [Op.ne]: true } }
        });
      } else if (userRole === 'Tester') {
        // Get tester's projects
        const testerProjects = await Project.findAll({ where: { testerId: userId }, attributes: ['id'] });
        const pIds = testerProjects.map(p => p.id);

        stats.inReview = await Task.count({ where: { projectId: pIds, status: 'IN_REVIEW', isArchived: { [Op.ne]: true } } });
        stats.doneTasks = await Task.count({ where: { projectId: pIds, status: 'DONE', isArchived: { [Op.ne]: true } } }); // Total Reviewed
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        stats.reviewedToday = await Task.count({
          where: { projectId: pIds, status: 'DONE', updatedAt: { [Op.gte]: today }, isArchived: { [Op.ne]: true } }
        });
        
        stats.overdueTasks = await Task.count({
          where: { projectId: pIds, status: { [Op.ne]: 'DONE' }, deadline: { [Op.lt]: new Date() } }
        });
      } else {
        // Developer
        stats.todoTasks = await Task.count({ where: { assigneeId: userId, status: 'TODO', isArchived: { [Op.ne]: true } } });
        stats.inProgressTasks = await Task.count({ where: { assigneeId: userId, status: 'IN_PROGRESS', isArchived: { [Op.ne]: true } } });
        stats.inReview = await Task.count({ where: { assigneeId: userId, status: 'IN_REVIEW', isArchived: { [Op.ne]: true } } });
        stats.doneTasks = await Task.count({ where: { assigneeId: userId, status: 'DONE', isArchived: { [Op.ne]: true } } });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        stats.doneToday = await Task.count({
          where: { assigneeId: userId, status: 'DONE', updatedAt: { [Op.gte]: today }, isArchived: { [Op.ne]: true } }
        });

        stats.overdueTasks = await Task.count({
          where: { assigneeId: userId, status: { [Op.ne]: 'DONE' }, deadline: { [Op.lt]: new Date() }, isArchived: { [Op.ne]: true } }
        });
        
        // For compatibility with old frontend checks
        stats.pendingTasks = stats.todoTasks + stats.inProgressTasks;
      }
    } catch (err) { console.error("Task stats error:", err); }

    // 2. Penalty Stats
    try {
      stats.penalties = await Penalty.count({
        where: userRole === 'Admin' ? {} : { userId }
      });
      const penaltySum = await Penalty.sum('amount', {
        where: userRole === 'Admin' ? {} : { userId }
      });
      stats.totalPenaltyAmount = penaltySum || 0;
    } catch (err) { console.error("Penalty stats error:", err); }

    // 3. Project & User Stats
    try {
      if (userRole === 'Admin') {
        stats.totalUsers = await User.count();
        stats.totalProjects = await Project.count();
      } else if (userRole === 'Tester') {
        stats.totalProjects = await Project.count({ where: { testerId: userId } });
      } else {
        // Developer
        const tlProjects = await Project.findAll({ where: { teamLeadId: userId }, attributes: ['id'] });
        const devTasks = await Task.findAll({
          where: { assigneeId: userId },
          attributes: ['projectId'],
          raw: true
        });
        const allIds = new Set([
          ...tlProjects.map(p => p.id),
          ...devTasks.map(t => t.projectId).filter(id => id)
        ]);
        stats.totalProjects = allIds.size;
      }
    } catch (err) { console.error("Project/User stats error:", err); }

    // 2. Assigned Projects (Simplified safe query)
    let assignedProjects = [];
    try {
      if (userRole === 'Admin') {
        assignedProjects = await Project.findAll({
          attributes: ['id', 'name', 'githubRepoLink', 'websiteLink'],
          limit: 10
        });
      } else if (userRole === 'Tester') {
        assignedProjects = await Project.findAll({
          where: { testerId: userId },
          attributes: ['id', 'name', 'githubRepoLink', 'websiteLink']
        });
      } else {
        // Developers: Get project IDs from their tasks first to be safe
        const taskProjects = await Task.findAll({
          where: { assigneeId: userId },
          attributes: ['projectId'],
          raw: true
        });
        const projectIds = [...new Set(taskProjects.map(t => t.projectId).filter(id => id))];

        if (projectIds.length > 0) {
          assignedProjects = await Project.findAll({
            where: { id: { [Op.in]: projectIds } },
            attributes: ['id', 'name', 'githubRepoLink', 'websiteLink']
          });
        }
      }
    } catch (e) {
      console.error("Dashboard projects sub-error:", e);
    }

    // 4. Recent Tasks (Safely)
    let recentTasks = [];
    try {
      const tasksWhere = userRole === 'Admin'
        ? { isArchived: { [Op.ne]: true } }
        : (userRole === 'Developer'
          ? { assigneeId: userId, isArchived: { [Op.ne]: true } }
          : (userRole === 'Tester'
            ? { status: 'IN_REVIEW', isArchived: { [Op.ne]: true } }
            : { isArchived: { [Op.ne]: true } }));

      const projectInclude = {
        model: Project,
        as: 'project',
        attributes: ['name'],
        where: { isArchived: { [Op.ne]: true } } // Exclude archived projects too
      };

      // Only filter by testerId in include if user is a Tester
      if (userRole === 'Tester') {
        projectInclude.where = { testerId: userId };
        projectInclude.required = true;
      }

      recentTasks = await Task.findAll({
        where: tasksWhere,
        include: [projectInclude],
        limit: 5,
        order: [['updatedAt', 'DESC']],
      });
    } catch (e) { console.error("Recent tasks error:", e); }

    // 5. Recent Penalties (Safely)
    let recentPenalties = [];
    try {
      recentPenalties = await Penalty.findAll({
        where: userRole === 'Admin' ? {} : { userId },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'user', attributes: ['fullName'] },
          { model: User, as: 'admin', attributes: ['fullName'] }
        ]
      });
    } catch (e) { console.error("Recent penalties error:", e); }

    res.status(200).send({
      stats,
      assignedProjects,
      recentTasks,
      recentPenalties
    });
  } catch (error) {
    console.error("Mobile dashboard error:", error);
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};