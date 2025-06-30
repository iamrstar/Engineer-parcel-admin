import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here_make_it_long_and_complex"

export function verifyToken(request) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, message: "No token provided" }
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)

    return { success: true, user: decoded }
  } catch (error) {
    return { success: false, message: "Invalid token" }
  }
}
