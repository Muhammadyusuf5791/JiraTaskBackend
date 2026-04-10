const Joi = require("joi");

const validateProject = (project) => {
  const schema = Joi.object({
    name: Joi.string().min(3).required(),
    description: Joi.string().allow("", null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    teamLeadId: Joi.number().integer().allow(null),
    testerId: Joi.number().integer().allow(null),
    websiteLink: Joi.string().allow("", null),
    githubRepoLink: Joi.string().allow("", null),
  }).unknown(true);

  return schema.validate(project);
};

const validateUpdateProject = (project) => {
  const schema = Joi.object({
    name: Joi.string().min(3),
    description: Joi.string().allow("", null),
    startDate: Joi.date().allow(null),
    endDate: Joi.date().allow(null),
    teamLeadId: Joi.number().integer().allow(null),
    testerId: Joi.number().integer().allow(null),
    websiteLink: Joi.string().allow("", null),
    githubRepoLink: Joi.string().allow("", null),
  }).unknown(true);

  return schema.validate(project);
};

module.exports = { validateProject, validateUpdateProject };
