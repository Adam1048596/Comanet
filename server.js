import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import product from "./src/routes/product.js";
import discount from "./src/routes/discount.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/products", product);
app.use("/discounts", discount);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Comanet Dashboard backend running!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));