const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Task comments management
 */

/**
 * @swagger
 * /api/comments:
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment to a task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - content
 *             properties:
 *               taskId:
 *                 type: integer
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.post("/comments", auth, commentController.addComment);

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     tags: [Comments]
 *     summary: Get all comments for a specific task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of comments
 *       500:
 *         description: Server error
 */
router.get("/tasks/:taskId/comments", auth, commentController.getCommentsByTask);

module.exports = router;
