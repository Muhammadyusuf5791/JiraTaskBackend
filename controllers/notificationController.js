const { Notification } = require("../models");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]]
    });
    res.status(200).send(notifications);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).send({ message: "Xabarnoma topilmadi" });
    if (notification.userId !== req.user.id) return res.status(403).send({ message: "Ruxsat yo'q" });

    await notification.update({ isRead: true });
    res.status(200).send(notification);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    res.status(200).send({ message: "Barchasi o'qildi deb belgilandi" });
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};
