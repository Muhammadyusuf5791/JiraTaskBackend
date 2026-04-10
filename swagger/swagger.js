const swaggerJSDoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express")

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Face-ID Task Management System API",
            version: "1.0.0",
            description: "Jira-like task management system with Face-ID tracking and Role-Based Access Control"
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./routes/*.js"]
}

const swaggerSpec = swaggerJSDoc(options)

const setupSwagger = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

module.exports = setupSwagger