const mongoose = require("mongoose")
const Schema = mongoose.Schema

const expenseSchema = new Schema({
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  splitAmong: [{ type: Schema.Types.ObjectId, ref: "User" }],
  group: { type: Schema.Types.ObjectId, ref: "Group", required: false },
})

module.exports = mongoose.model("Expense", expenseSchema)
