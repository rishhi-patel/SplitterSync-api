const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")

const Expense = require("../models/Expense")
const Balance = require("../models/Balance")
const { updateBalances } = require("../utils/expenseUtils")

// Get expenses by user
router.get("/activity", async (req, res) => {
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

router.get("/", async (req, res) => {
  // Function to get balances for a specified user
  try {
    const userIdObj = new mongoose.Types.ObjectId(req.user) // Convert to ObjectId

    const pipeline = [
      {
        $match: {
          $or: [{ user1: userIdObj }, { user2: userIdObj }],
        },
      },
      {
        $project: {
          _id: 0, // Optionally remove the ID from the result
          otherUser: {
            $cond: {
              if: { $eq: ["$user1", userIdObj] },
              then: "$user2",
              else: "$user1",
            },
          },
          owesOrLent: {
            $cond: {
              if: {
                $and: [{ $eq: ["$user1", userIdObj] }, "$user1OwesUser2"],
              },
              then: "owes",
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$user2", userIdObj] },
                      { $not: ["$user1OwesUser2"] },
                    ],
                  },
                  then: "owes",
                  else: "lent",
                },
              },
            },
          },
          amount: {
            $cond: {
              if: { $lt: ["$amount", 0] },
              then: { $multiply: ["$amount", -1] }, // Convert to positive if negative
              else: "$amount",
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "otherUser",
          foreignField: "_id",
          as: "otherUserDetails",
        },
      },
      {
        $unwind: "$otherUserDetails",
      },
      {
        $project: {
          otherUserName: "$otherUserDetails.name",
          otherUserEmail: "$otherUserDetails.email",
          owesOrLent: 1,
          amount: 1,
        },
      },
    ]

    const results = await Balance.aggregate(pipeline)
    res.json(results)
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
    await updateBalances(newExpense)
    res.status(201).json(newExpense)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Update an existing expense
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { amount, description, paidBy, splitAmong, group } = req.body

    // Find and temporarily store the old expense for balance adjustments
    const oldExpense = await Expense.findById(id)
    if (!oldExpense) {
      return res.status(404).json({ message: "Expense not found" })
    }

    // Update the expense document
    const updatedExpense = await Expense.findByIdAndUpdate(
      id,
      {
        $set: {
          amount,
          description,
          paidBy,
          splitAmong,
          group,
        },
      },
      { new: true }
    )

    // Reverse balances for the old expense details
    await updateBalances(oldExpense, true) // true indicates reversal
    // Update balances with the new expense details
    await updateBalances(updatedExpense)

    res.status(200).json(updatedExpense)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Delete an expense
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Find and temporarily store the expense for balance adjustments
    const expense = await Expense.findById(id)
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" })
    }

    // Delete the expense
    await Expense.findByIdAndDelete(id)

    // Reverse the balances impacted by this expense
    await updateBalances(expense, true) // Reversal indicated by true

    res.status(200).send("Expense deleted successfully")
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

module.exports = router
