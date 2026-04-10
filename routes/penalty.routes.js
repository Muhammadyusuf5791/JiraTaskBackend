const express = require("express");
const router = express.Router();
const penaltyController = require("../controllers/penaltyController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/roleAuth");

/**
 * @swagger
 * tags:
 *   name: Penalties
 *   description: Penalty management
 */

/**
 * @swagger
 * /api/penalties:
 *   post:
 *     tags: [Penalties]
 *     summary: Create a new penalty (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - reason
 *               - amount
 *             properties:
 *               userId:
 *                 type: integer
 *               reason:
 *                 type: string
 *               amount:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Penalty created successfully
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Server error
 */
router.post("/penalties", auth, checkRole(["Admin"]), penaltyController.createPenalty);

/**
 * @swagger
 * /api/penalties:
 *   get:
 *     tags: [Penalties]
 *     summary: Get all penalties (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all penalties
 *       500:
 *         description: Server error
 */
router.get("/penalties", auth, checkRole(["Admin", "Developer", "Tester"]), penaltyController.getPenalties);

/**
 * @swagger
 * /api/penalties/user/{userId}:
 *   get:
 *     tags: [Penalties]
 *     summary: Get all penalties for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of penalties for the user
 *       500:
 *         description: Server error
 */
router.get("/penalties/user/:userId", auth, penaltyController.getPenaltiesByUser);

/**
 * @swagger
 * /api/penalties/{id}:
 *   delete:
 *     tags: [Penalties]
 *     summary: Delete a penalty (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Penalty deleted
 *       404:
 *         description: Penalty not found
 *       500:
 *         description: Server error
 */
router.delete("/penalties/:id", auth, checkRole(["Admin"]), penaltyController.deletePenalty);

module.exports = router;
