const express = require("express")
const router = express.Router()
const Group = require("../models/Group")

// Get all groups
router.get("/", async (req, res) => {
  try {
    const groups = await Group.find().populate("members", "name email")
    res.json(groups)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
// Get all groups
router.get("/me", async (req, res) => {
  try {
    const userId = req.user
    const groups = await Group.find({ members: { $in: [userId] } }).populate(
      "members",
      "name email"
    )
    res.json(groups)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Create a new group
router.post("/", async (req, res) => {
  try {
    const userId = req.user
    console.log(userId)
    const group = new Group({
      name: req.body.name,
      members: [userId, ...req.body.members],
    })
    const newGroup = await group.save()
    res.status(201).json(newGroup)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// Add member to a group
router.post("/:groupId/members", async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
    if (!group) return res.status(404).json({ message: "Group not found" })
    group.members.push(req.body.userId)
    await group.save()
    res.status(200).json(group)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
