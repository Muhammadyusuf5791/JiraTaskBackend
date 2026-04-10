const { Penalty, User, Notification } = require("../models");

exports.createPenalty = async (req, res) => {
  const { userId, reason, amount, date } = req.body;
  const adminId = req.user.id;

  try {
    const penalty = await Penalty.create({ userId, adminId, reason, amount, date });
    
    // Create notification for the user
    await Notification.create({
      userId,
      content: `Sizga jarima qo'shildi: ${reason} (${amount})`,
      type: 'PENALTY'
    });

    res.status(201).send(penalty);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getPenalties = async (req, res) => {
  try {
    const whereClause = {};
    if (req.user && req.user.role !== "Admin") {
      whereClause.userId = req.user.id;
    }

    const penalties = await Penalty.findAll({
      where: whereClause,
      include: [
        { model: User, as: "user", attributes: ["id", "fullName", "phone", "role"] },
        { model: User, as: "admin", attributes: ["id", "fullName"] }
      ]
    });
    res.status(200).send(penalties);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getPenaltiesByUser = async (req, res) => {
  try {
    const penalties = await Penalty.findAll({
      where: { userId: req.params.userId },
      include: [{ model: User, as: "admin", attributes: ["fullName"] }]
    });
    res.status(200).send(penalties);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.deletePenalty = async (req, res) => {
  try {
    const penalty = await Penalty.findByPk(req.params.id);
    if (!penalty) return res.status(404).send({ message: "Jarima topilmadi" });

    await penalty.destroy();
    res.status(200).send({ message: "Jarima muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};
