const express = require("express")
const router = express.Router()
const Expense = require("../models/Expense")
const mongoose = require("mongoose")

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
router.get("/", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user) // Assuming this is the user ID obtained from authentication

    const pipeline = [
      {
        // Match expenses involving the user either as payer or a part of the split group
        $match: {
          $or: [{ paidBy: userId }, { splitAmong: userId }],
        },
      },
      {
        // Join with user data for paidBy and splitAmong
        $lookup: {
          from: "users",
          localField: "paidBy",
          foreignField: "_id",
          as: "paidByDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "splitAmong",
          foreignField: "_id",
          as: "splitAmongDetails",
        },
      },
      {
        // Provide necessary details from joined collections
        $unwind: "$paidByDetails",
      },
      {
        // Calculate the split amount
        $addFields: {
          splitAmount: { $divide: ["$amount", { $size: "$splitAmong" }] },
        },
      },
      {
        // Add the "you lent" or "you owed" amount
        $addFields: {
          roleDetails: {
            $cond: {
              if: { $eq: ["$paidBy", userId] },
              then: {
                role: "you lent",
                amount: {
                  $multiply: [
                    { $subtract: [{ $size: "$splitAmong" }, 1] },
                    "$splitAmount",
                  ],
                },
              },
              else: {
                role: "you owed",
                amount: "$splitAmount",
              },
            },
          },
        },
      },
      {
        // Select final projection for output
        $project: {
          description: 1,
          totalAmount: "$amount",
          paidBy: "$paidByDetails.name",
          splitAmong: "$splitAmongDetails.name",
          role: "$roleDetails.role",
          amount: "$roleDetails.amount",
        },
      },
    ]

    const expenses = await Expense.aggregate(pipeline)
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

router.get("/:expenseId", async (req, res) => {
  try {
    const expenseId = new mongoose.Types.ObjectId(req.params.expenseId)
    const pipeline = [
      {
        $match: { _id: expenseId },
      },
      {
        $lookup: {
          from: "users",
          localField: "paidBy",
          foreignField: "_id",
          as: "paidByDetails",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "splitAmong",
          foreignField: "_id",
          as: "participants",
        },
      },
      {
        $project: {
          description: 1,
          amount: 1,
          paidBy: { $arrayElemAt: ["$paidByDetails", 0] },
          debts: {
            $map: {
              input: "$participants",
              as: "participant",
              in: {
                name: "$$participant.name",
                email: "$$participant.email",
                owedAmount: { $divide: ["$amount", { $size: "$splitAmong" }] },
              },
            },
          },
        },
      },
    ]

    const result = await Expense.aggregate(pipeline)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
