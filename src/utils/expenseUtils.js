const Balance = require("../models/Balance")

// Helper function to update balances, optionally reversing old balances
const updateBalances = async (expense, reverse = false) => {
  const multiplier = reverse ? -1 : 1 // Multiplier for reversing the effect if needed
  const splitAmount = (expense.amount / expense.splitAmong.length) * multiplier

  for (let userId of expense.splitAmong) {
    if (userId.toString() === expense.paidBy.toString()) continue // Skip if the participant is the payer

    const sortedIds = [userId.toString(), expense.paidBy.toString()].sort()
    console.log(sortedIds)
    const balanceId = sortedIds.join("_")
    const balance =
      (await Balance.findById(balanceId)) ||
      new Balance({
        _id: balanceId,
        user1: sortedIds[0], // Consistently user1 is the lower sorted ID
        user2: sortedIds[1], // Consistently user2 is the higher sorted ID
        amount: 0,
        user1OwesUser2: true, // Defaulting to true, adjusted below
      })

    // Determine the balance update based on who paid
    if (expense.paidBy.toString() === sortedIds[0]) {
      balance.amount += splitAmount // user1 paid, increase the amount user2 owes to user1
    } else {
      balance.amount -= splitAmount // user2 paid, decrease the amount (or increase the debt user1 owes to user2)
    }

    // Adjust who owes whom based on the balance amount
    if (balance.amount === 0) {
      // Optionally handle zero balance case, such as removing the record
      // await balance.remove();
      balance.user1OwesUser2 = true // Reset flag, or remove the record
    } else {
      balance.user1OwesUser2 = balance.amount > 0 // true if user1 owes user2 (positive amount)
    }

    await balance.save()
  }
}

module.exports = { updateBalances }
