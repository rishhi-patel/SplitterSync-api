const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")

const connectDB = require("./db")

const app = express()
app.use(bodyParser.json())

// Connect to MongoDB
connectDB()

// Import routes
const usersRoutes = require("./routes/users")
const groupsRoutes = require("./routes/groups")
const expensesRoutes = require("./routes/expenses")

// Use routes
app.use("/users", usersRoutes)
app.use("/groups", groupsRoutes)
app.use("/expenses", expensesRoutes)

const port = 8080
app.listen(port, () => console.log(`Server running on port ${port}`))
