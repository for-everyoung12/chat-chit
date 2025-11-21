import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectedRoute = async (req, res, next) => {
  try {
    //get accessToken from headers
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; //Bearer <token>

    if (!token) {
      return res.status(401).json({ message: "Access token is missing" });
    }
    //check if accessToken exists
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        console.error("JWT verification error in authMiddleware", err);
        return res
          .status(403)
          .json({ message: "Access token expired or invalid" });
      }
      //find user
      const user = await User.findById(decoded.userId).select("-hashPassword");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      //return user info in req.user
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Verify JWT error in authMiddleware", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
