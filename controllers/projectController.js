const { Project, User } = require("../models");
const { validateProject, validateUpdateProject } = require("../validation/projectValidation");

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
    const whereClause = {};
    if (req.user && req.user.role === "Tester") {
      whereClause.testerId = req.user.id;
    }
    if (req.user && req.user.role === "Developer") {
      whereClause.teamLeadId = req.user.id;
    }

    const projects = await Project.findAll({
      where: whereClause,
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
    res.status(200).send(projects);
  } catch (error) {
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
