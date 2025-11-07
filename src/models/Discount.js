import mongoose from "mongoose";

const discountSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  percentage: { type: Number, required: true }, // e.g., 15 for 15%
  startDate: { type: Date, default: Date.now }, // when discount starts
  endDate: { type: Date }, // when discount ends, optional
  createdAt: { type: Date, default: Date.now },
});

const Discount = mongoose.model("Discount", discountSchema);

export default Discount;