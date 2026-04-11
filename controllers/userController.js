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
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'fullName', 'phone', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).send({ message: "Foydalanuvchi topilmadi." });
    }

    // Aggregate stats for profile
    const doneTasks = await Task.count({ where: { assigneeId: userId, status: 'DONE' } });
    const activeTasks = await Task.count({ where: { assigneeId: userId, status: ['TODO', 'IN_PROGRESS'] } });
    
    // Project count based on role
    let projectCount = 0;
    if (user.role === 'Admin') {
      projectCount = await Project.count();
    } else if (user.role === 'Tester') {
      projectCount = await Project.count({ where: { testerId: userId } });
    } else {
      const devTasks = await Task.findAll({ where: { assigneeId: userId }, attributes: ['projectId'], raw: true });
      projectCount = new Set(devTasks.map(t => t.projectId).filter(id => id)).size;
    }

    const userData = user.toJSON();
    userData.stats = {
      doneTasks,
      activeTasks,
      projectCount
    };

    res.status(200).send(userData);
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
      const taskFilter = { isArchived: { [Op.ne]: true } }; // Base filter for Projects
      const projectInclude = { model: Project, as: 'project', where: taskFilter, attributes: [] };

      if (userRole === 'Admin') {
        stats.pendingTasks = await Task.count({ 
          where: { status: ['TODO', 'IN_PROGRESS'] },
          include: [projectInclude]
        });
        stats.inReview = await Task.count({ 
          where: { status: 'IN_REVIEW' },
          include: [projectInclude]
        });
        stats.doneTasks = await Task.count({ 
          where: { status: 'DONE' },
          include: [projectInclude]
        });
        stats.overdueTasks = await Task.count({
          where: { status: { [Op.ne]: 'DONE' }, deadline: { [Op.lt]: new Date() } },
          include: [projectInclude]
        });
      } else if (userRole === 'Tester') {
        stats.inReview = await Task.count({ 
          where: { status: 'IN_REVIEW' },
          include: [{ model: Project, as: 'project', where: { testerId: userId, isArchived: { [Op.ne]: true } }, attributes: [] }]
        });
        stats.doneTasks = await Task.count({ 
          where: { status: 'DONE' },
          include: [{ model: Project, as: 'project', where: { testerId: userId, isArchived: { [Op.ne]: true } }, attributes: [] }]
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        stats.reviewedToday = await Task.count({
          where: { status: 'DONE', updatedAt: { [Op.gte]: today } },
          include: [{ model: Project, as: 'project', where: { testerId: userId, isArchived: { [Op.ne]: true } }, attributes: [] }]
        });
      } else {
        // Developer
        stats.todoTasks = await Task.count({ where: { assigneeId: userId, status: 'TODO' }, include: [projectInclude] });
        stats.inProgressTasks = await Task.count({ where: { assigneeId: userId, status: 'IN_PROGRESS' }, include: [projectInclude] });
        stats.inReview = await Task.count({ where: { assigneeId: userId, status: 'IN_REVIEW' }, include: [projectInclude] });
        stats.doneTasks = await Task.count({ where: { assigneeId: userId, status: 'DONE' }, include: [projectInclude] });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        stats.doneToday = await Task.count({
          where: { assigneeId: userId, status: 'DONE', updatedAt: { [Op.gte]: today } },
          include: [projectInclude]
        });

        stats.overdueTasks = await Task.count({
          where: { assigneeId: userId, status: { [Op.ne]: 'DONE' }, deadline: { [Op.lt]: new Date() } },
          include: [projectInclude]
        });
        
        stats.pendingTasks = stats.todoTasks + stats.inProgressTasks;
      }
    } catch (err) { console.error("Task stats error:", err); }

    // 2. Penalty Stats
    try {
      stats.penalties = await Penalty.count({
        where: userRole === 'Admin' ? {} : { userId }
      });
      // Sum string amount manually or cast it
      const allPenalties = await Penalty.findAll({
        where: userRole === 'Admin' ? {} : { userId },
        attributes: ['amount']
      });
      const penaltySum = allPenalties.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
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
        ? {}
        : (userRole === 'Developer'
          ? { assigneeId: userId }
          : (userRole === 'Tester'
            ? { status: 'IN_REVIEW' }
            : {}));

      recentTasks = await Task.findAll({
        where: tasksWhere,
        include: [{
          model: Project,
          as: 'project',
          attributes: ['name'],
          where: { isArchived: { [Op.ne]: true } }
        }],
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

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.scope(null).findByPk(userId);
    if (!user) return res.status(404).send({ message: "Foydalanuvchi topilmadi" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).send({ message: "Joriy parol noto'g'ri" });

    user.password = newPassword; // beforeSave hook will hash it
    await user.save();

    res.status(200).send({ message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).send({ message: "Serverda xatolik" });
  }
};