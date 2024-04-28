const { verifyToken } = require("../utils/jwt")

const AuthMiddleware = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers["authorization"]
  if (!authHeader) {
    return res.status(401).send("Access denied. No token provided.")
  }

  // Expect the header to be "Bearer [token]"
  const token = authHeader.split(" ")[1]
  if (!token) {
    return res.status(401).send("Access denied. No token provided.")
  }

  try {
    req.user = verifyToken(token)
    next()
  } catch (err) {
    res.status(400).send("Invalid token")
  }
}

module.exports = AuthMiddleware
