const express = require("express")
const router = express.Router()

const usersRoutes = require("./users")
const groupsRoutes = require("./groups")
const expensesRoutes = require("./expenses")

router.use("/users", usersRoutes)
router.use("/groups", groupsRoutes)
router.use("/expenses", expensesRoutes)

module.exports = router
