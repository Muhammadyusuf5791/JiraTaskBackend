const { User, Task, Penalty, Notification, Project } = require("../models");
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

    // 1. Basic Stats
    const stats = {
      pendingTasks: await Task.count({ 
        where: userRole === 'Admin' ? { status: ['TODO', 'IN_PROGRESS'] } : { assigneeId: userId, status: ['TODO', 'IN_PROGRESS'] }
      }),
      inReview: await Task.count({ 
        where: userRole === 'Admin' ? { status: 'IN_REVIEW' } : (userRole === 'Tester' ? { status: 'IN_REVIEW' } : { assigneeId: userId, status: 'IN_REVIEW' })
      }),
      doneTasks: await Task.count({ 
        where: userRole === 'Admin' ? { status: 'DONE' } : { assigneeId: userId, status: 'DONE' }
      }),
      penalties: await Penalty.count({ 
        where: userRole === 'Admin' ? {} : { userId }
      }),
      totalUsers: userRole === 'Admin' ? await User.count() : undefined,
      totalProjects: userRole === 'Admin' ? await Project.count() : undefined,
    };

    // 2. Recent Tasks
    const recentTasks = await Task.findAll({
      where: userRole === 'Admin' ? {} : (userRole === 'Developer' ? { assigneeId: userId } : (userRole === 'Tester' ? { status: 'IN_REVIEW' } : {})),
      limit: 5,
      order: [['updatedAt', 'DESC']],
      include: [{ model: Project, as: 'project', attributes: ['name'] }]
    });

    // 3. Recent Penalties
    const recentPenalties = await Penalty.findAll({
      where: userRole === 'Admin' ? {} : { userId },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['fullName'] },
        { model: User, as: 'admin', attributes: ['fullName'] }
      ]
    });

    res.status(200).send({
      stats,
      recentTasks,
      recentPenalties
    });
  } catch (error) {
    console.error("Mobile dashboard error:", error);
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};