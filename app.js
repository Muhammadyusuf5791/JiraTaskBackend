const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { sequelize } = require("./models");

const userRoutes = require("./routes/user.routes");
const projectRoutes = require("./routes/project.routes");
const taskRoutes = require("./routes/task.routes");
const penaltyRoutes = require("./routes/penalty.routes");
const commentRoutes = require("./routes/comment.routes");
const notificationRoutes = require("./routes/notification.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const setupSwagger = require("./swagger/swagger");

dotenv.config();

const app = express(); 

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: "*" }));

app.use("/api", userRoutes);
app.use("/api", projectRoutes);
app.use("/api", taskRoutes);
app.use("/api", penaltyRoutes);
app.use("/api", commentRoutes);
app.use("/api", notificationRoutes);
app.use("/api", dashboardRoutes);

setupSwagger(app);

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("Database ulandi");
    app.listen(PORT, "0.0.0.0", () => { 
      console.log(`Server is running on port ${PORT} (0.0.0.0)`);
    });
  })
  .catch(err => {
      console.error("Database connection failed:", err);
  });