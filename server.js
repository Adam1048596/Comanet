import authRoutes from "./src/routes/authRoutes.js";
import express from "express";
import cors from "cors";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// Default route to test
app.get("/", (req, res) => {
  res.send("✅ Comanet API is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});