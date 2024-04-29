const mongoose = require("mongoose")

const balanceSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Concatenated string of two userIds in sorted order
  amount: { type: Number, required: true }, // Positive or negative value representing the balance
  user1: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user1OwesUser2: { type: Boolean, required: true }, // Indicates the direction of the debt
})

module.exports = mongoose.model("Balance", balanceSchema)
