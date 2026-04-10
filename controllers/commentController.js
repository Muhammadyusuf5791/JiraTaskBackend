const { Comment, User, Task, Notification, Project } = require("../models");

exports.addComment = async (req, res) => {
  const { taskId, content } = req.body;
  const userId = req.user.id;

  try {
    const task = await Task.findByPk(taskId);
    if (!task) return res.status(404).send({ message: "Vazifa topilmadi" });

    const comment = await Comment.create({ taskId, userId, content });
    
    // Notification triggers
    // 1. Notify Assignee
    if (task.assigneeId && task.assigneeId !== userId) {
        await Notification.create({
            userId: task.assigneeId,
            content: `Vazifaga yangi izoh qo'shildi: ${content.substring(0, 20)}...`,
            type: 'TASK'
        });
    }

    // 2. Notify Team Lead (Admin)
    const project = await Project.findByPk(task.projectId);
    if (project && project.teamLeadId && project.teamLeadId !== userId) {
        await Notification.create({
            userId: project.teamLeadId,
            content: `Vazifa muhokamasida yangi izoh: ${task.title} (${req.user.fullName})`,
            type: 'TASK'
        });
    }

    // 3. Global Notification for all Admins
    const admins = await User.findAll({ where: { role: 'Admin' } });
    for (const admin of admins) {
      if (admin.id !== userId && admin.id !== project?.teamLeadId) { // Avoid duplicate if admin is team lead
        await Notification.create({
          userId: admin.id,
          content: `[MUHOKAMA] Yangi izoh: ${task.title} (${req.user.fullName})`,
          type: 'TASK'
        });
      }
    }

    res.status(201).send(comment);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getCommentsByTask = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { taskId: req.params.taskId },
      include: [{ model: User, as: "user", attributes: ["id", "fullName", "role"] }],
      order: [["createdAt", "ASC"]]
    });
    res.status(200).send(comments);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};
