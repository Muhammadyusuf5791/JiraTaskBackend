const { Project, User, Task } = require("../models");
const { validateProject, validateUpdateProject } = require("../validation/projectValidation");
const { Op } = require("sequelize");

exports.createProject = async (req, res) => {
  const { error } = validateProject(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const project = await Project.create(req.body);
    res.status(201).send(project);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let projects = [];

    if (userRole === "Admin") {
      projects = await Project.findAll({
        include: [
          { model: User, as: "teamLead", attributes: ["id", "fullName", "role"] },
          { model: User, as: "tester", attributes: ["id", "fullName", "role"] },
        ],
      });
    } else if (userRole === "Tester") {
      projects = await Project.findAll({
        where: { testerId: userId },
        include: [
          { model: User, as: "teamLead", attributes: ["id", "fullName", "role"] },
          { model: User, as: "tester", attributes: ["id", "fullName", "role"] },
        ],
      });
    } else {
      // Developer: Find projects where they have tasks assigned
      const taskProjects = await Task.findAll({
        where: { assigneeId: userId },
        attributes: ["projectId"],
        raw: true
      });
      const projectIds = [...new Set(taskProjects.map(t => t.projectId).filter(id => id))];
      
      if (projectIds.length > 0) {
        projects = await Project.findAll({
          where: { id: { [Op.in]: projectIds } },
          include: [
            { model: User, as: "teamLead", attributes: ["id", "fullName", "role"] },
            { model: User, as: "tester", attributes: ["id", "fullName", "role"] },
          ],
        });
      }
    }

    res.status(200).send(projects);
  } catch (error) {
    console.error("getProjects error:", error);
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "teamLead",
          attributes: ["id", "fullName", "phone", "role"],
        },
        {
          model: User,
          as: "tester",
          attributes: ["id", "fullName", "phone", "role"],
        },
      ],
    });
    if (!project) return res.status(404).send({ message: "Loyiha topilmadi" });
    res.status(200).send(project);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.updateProject = async (req, res) => {
  const { error } = validateUpdateProject(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).send({ message: "Loyiha topilmadi" });

    await project.update(req.body);
    res.status(200).send(project);
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).send({ message: "Loyiha topilmadi" });

    await project.destroy();
    res.status(200).send({ message: "Loyiha muvaffaqiyatli o'chirildi" });
  } catch (error) {
    res.status(500).send({ message: "Serverda xatolik", error: error.message });
  }
};
