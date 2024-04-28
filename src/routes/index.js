const express = require("express")
const router = express.Router()

const usersRoutes = require("./users")
const groupsRoutes = require("./groups")
const expensesRoutes = require("./expenses")
const AuthMiddleware = require("../middlewares/AuthMiddleware")

router.use("/users", usersRoutes)
router.use("/groups", AuthMiddleware, groupsRoutes)
router.use("/expenses", AuthMiddleware, expensesRoutes)

module.exports = router
