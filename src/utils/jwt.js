const jwt = require("jsonwebtoken")
const secret = "your_secret_key"

const getToken = (userID) => {
  return jwt.sign({ userId: userID }, secret, {
    expiresIn: "30d",
  })
}

const verifyToken = (token) => {
  return jwt.verify(token, secret)?.userId || null
}

module.exports = { getToken, verifyToken }
