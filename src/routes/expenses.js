const express = require("express")
const router = express.Router()
const Expense = require("../models/Expense")

const userId = "662ec6fb825c87911ee10a44"

// Create a new expense
router.post("/", async (req, res) => {
  const expense = new Expense({
    amount: req.body.amount,
    description: req.body.description,
    paidBy: req.body.paidBy,
    splitAmong: req.body.splitAmong,
    group: req.body.group,
  })
  try {
    const newExpense = await expense.save()
    res.status(201).json(newExpense)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Get expenses by user
// Get expenses by user
router.get("/", async (req, res) => {
  try {
    // const userId = req.params.userId
    const expenses = await Expense.find({ splitAmong: { $in: [userId] } }) // This uses $in to find documents where userId is in the splitAmong array
      .populate("paidBy", "name email") // Populating details of the user who paid
      .populate("splitAmong", "name email") // Populating details of all users involved in the split
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get expenses in a group
router.get("/group/:groupId", async (req, res) => {
  try {
    const expenses = await Expense.find({ group: req.params.groupId })
      .populate("paidBy", "name")
      .populate("splitAmong", "name")
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
