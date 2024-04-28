const express = require("express")
const router = express.Router()
const User = require("../models/User")
const bcrypt = require("bcrypt")

const { getToken } = require("../utils/jwt")
const AuthMiddleware = require("../middlewares/AuthMiddleware")

// Get all users
router.get("/", AuthMiddleware, async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// // Create a new user
// router.post("/", async (req, res) => {
//   const user = new User({
//     name: req.body.name,
//     email: req.body.email,
//   })
//   try {
//     const newUser = await user.save()
//     res.status(201).json(newUser)
//   } catch (err) {
//     res.status(400).json({ message: err.message })
//   }
// })

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = new User({ name, email, password })
    await user.save()
    const token = getToken(user._id)
    res.status(201).send({ message: "User registered", token })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// User login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).send("Authentication failed")

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) return res.status(500).json({ message: err.message })
      if (result) {
        const token = getToken(user._id)
        res.json({ token })
      } else {
        res.status(401).send("Authentication failed")
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
