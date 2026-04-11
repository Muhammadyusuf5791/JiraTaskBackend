const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/roleAuth");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Monitoring and reports
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get overall statistics for Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics object
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get("/admin/stats", auth, checkRole(["Admin"]), dashboardController.getAdminStats);
router.get("/tester/stats", auth, checkRole(["Tester"]), dashboardController.getTesterStats);

/**
 * @swagger
 * /api/user/profile/{userId}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get user profile by ID (or own profile if no ID)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User profile details with tasks and projects
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/user/profile", auth, dashboardController.getUserProfile);
router.get("/user/profile/:userId", auth, dashboardController.getUserProfile);

module.exports = router;
