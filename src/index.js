require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const cors = require("cors")
const morgan = require("morgan")

const connectDB = require("./db")
const routes = require("./routes") // Importing the centralized routes

const app = express()
app.use(bodyParser.json())
app.use(morgan("dev"))
app.use(cors())
// Connect to MongoDB
connectDB()

// Import routes
const usersRoutes = require("./routes/users")
const groupsRoutes = require("./routes/groups")
const expensesRoutes = require("./routes/expenses")

// Use centralized routes
app.use("/", routes)

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Server running on port ${port}`))
