const { Task, User, Project, Notification } = require("../models");
const { validateTask, validateUpdateTask } = require("../validation/taskValidation");

exports.createTask = async (req, res) => {
  const { error } = validateTask(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const task = await Task.create(req.body);
    res.status(201).send(task);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const whereClause = {};
    
    // If the user is a Tester, only show IN_REVIEW tasks from projects they are assigned to
    if (req.user && req.user.role === "Tester") {
      const assignedProjects = await Project.findAll({
        where: { testerId: req.user.id },
        attributes: ['id']
      });
      const projectIds = assignedProjects.map(p => p.id);
      whereClause.projectId = projectIds;
      whereClause.status = 'IN_REVIEW';
    }

    // If the user is a Developer, only show tasks assigned to them
    if (req.user && req.user.role === "Developer") {
      whereClause.assigneeId = req.user.id;
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "fullName", "phone", "role"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "testerId"],
        },
      ],
    });
    res.status(200).send(tasks);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "fullName", "phone", "role"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "name"],
        },
      ],
    });
    if (!task) return res.status(404).send({ message: "Vazifa topilmadi" });
    res.status(200).send(task);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getTasksByProject = async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = await Task.findAll({
        where: { projectId },
        include: [
          {
            model: User,
            as: "assignee",
            attributes: ["id", "fullName", "phone", "role"],
          },
        ],
      });
      res.status(200).send(tasks);
    } catch (error) {
      res.status(500).send({ message: "Serverda xatolik", error: error.message });
    }
  };

exports.updateTask = async (req, res) => {
  const { error } = validateUpdateTask(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const oldTask = await Task.findByPk(req.params.id);
    if (!oldTask) return res.status(404).send({ message: "Vazifa topilmadi" });

    await oldTask.update(req.body);

    // Notification triggers
    if (req.body.assigneeId && req.body.assigneeId !== oldTask.assigneeId) {
        await Notification.create({
            userId: req.body.assigneeId,
            content: `Sizga yangi vazifa biriktirildi: ${oldTask.title}`,
            type: 'TASK'
        });
    }

    if (req.body.status && req.body.status !== oldTask.status) {
        // Find project and its Team Lead
        const project = await Project.findByPk(oldTask.projectId);

        // Notify Assignee (Confirmation)
        await Notification.create({
            userId: oldTask.assigneeId,
            content: `Vazifa statusi o'zgardi: ${req.body.status}`,
            type: 'TASK'
        });

        // Notify Team Lead if someone else updates the status
        if (project && project.teamLeadId && project.teamLeadId !== req.user.id) {
            let statusMessage = "";
            if (req.body.status === 'IN_REVIEW') {
                statusMessage = `Vazifa tekshiruvga tayyor: ${oldTask.title} (${req.user.fullName} tomonidan)`;
            } else if (req.body.status === 'DONE') {
                statusMessage = `Vazifa muvaffaqiyatli yakunlandi: ${oldTask.title}`;
            }

            if (statusMessage) {
                await Notification.create({
                    userId: project.teamLeadId,
                    content: statusMessage,
                    type: 'TASK'
                });
            }
        }

        // Global Notification for all Admins on key status changes
        if (req.body.status === 'IN_REVIEW' || req.body.status === 'DONE') {
          const admins = await User.findAll({ where: { role: 'Admin' } });
          const statusLabel = req.body.status === 'IN_REVIEW' ? 'tekshiruvga yuborildi' : 'yakunlandi';
          const globalMessage = `[GLOBAL] Vazifa ${statusLabel}: ${oldTask.title} (${req.user.fullName} tomonidan)`;
          
          for (const admin of admins) {
            if (admin.id !== req.user.id) { // Don't notify the person who made the change
              await Notification.create({
                userId: admin.id,
                content: globalMessage,
                type: 'TASK'
              });
            }
          }
        }

        // Notify Tester if task moves to IN_REVIEW
        if (req.body.status === 'IN_REVIEW' && project && project.testerId) {
            await Notification.create({
                userId: project.testerId,
                content: `Yangi vazifa tekshiruv uchun tayyor: ${oldTask.title}`,
                type: 'TASK'
            });
        }

        // Notify Developer if task is returned (Rejected by Tester)
        if (oldTask.status === 'IN_REVIEW' && req.body.status === 'IN_PROGRESS') {
            await Notification.create({
                userId: oldTask.assigneeId,
                content: `Vazifa tekshiruvdan qaytarildi: ${oldTask.title}. Iltimos, xatolarni ko'rib chiqing.`,
                type: 'TASK'
            });
        }
    }

    res.status(200).send(oldTask);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).send({ message: "Vazifa topilmadi" });

    await task.destroy();
    res.status(200).send({ message: "Vazifa muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};
