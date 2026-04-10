const Joi = require("joi")

const validateUser = (user) => {
    const schema = Joi.object({
        fullName: Joi.string().min(3).required(),
        phone: Joi.string().required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid("Admin", "Developer", "Tester").default("Developer"),
    })

    return schema.validate(user)
}

const validateUpdateUser = (user) => {
    const schema = Joi.object({
        fullName: Joi.string().min(3),
        phone: Joi.string(),
        password: Joi.string().min(6),
        role: Joi.string().valid("Admin", "Developer", "Tester"),
    })

    return schema.validate(user)
}

module.exports = {validateUser, validateUpdateUser}