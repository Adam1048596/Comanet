// src/routes/discount.js
import express from "express";
import Discount from "../models/Discount.js";

const router = express.Router();

// Create a discount
router.post("/", async (req, res) => {
  try {
    const discount = new Discount(req.body);
    await discount.save();
    res.status(201).json(discount);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all discounts
router.get("/", async (req, res) => {
  try {
    const discounts = await Discount.find().populate("product");
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
