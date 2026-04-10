const Joi = require("joi");

const validateTask = (task) => {
  const schema = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().allow("", null),
    status: Joi.string()
      .valid("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE")
      .default("TODO"),
    startDate: Joi.date().allow(null),
    deadline: Joi.date().allow(null),
    assigneeId: Joi.number().integer().allow(null),
    projectId: Joi.number().integer().required(),
  });

  return schema.validate(task);
};

const validateUpdateTask = (task) => {
  const schema = Joi.object({
    title: Joi.string().min(3),
    description: Joi.string().allow("", null),
    status: Joi.string().valid("TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"),
    startDate: Joi.date().allow(null),
    deadline: Joi.date().allow(null),
    assigneeId: Joi.number().integer().allow(null),
    projectId: Joi.number().integer(),
  });

  return schema.validate(task);
};

module.exports = { validateTask, validateUpdateTask };
