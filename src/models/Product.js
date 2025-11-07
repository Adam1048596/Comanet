import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  brand: { type: String, required: true },
  stock: { type: Number, default: 0 },
  images: { type: [String], default: [] }, // array for multiple images
  discount: { type: Number, default: 0 },  // percentage discount
  details: { type: String },               // extended HTML/details
  finalPrice: { type: Number },            // price after discount
  createdAt: { type: Date, default: Date.now }
});

// Middleware to calculate finalPrice automatically
productSchema.pre("save", function(next) {
  if(this.discount > 0) {
    this.finalPrice = this.price - (this.price * (this.discount / 100));
  } else {
    this.finalPrice = this.price;
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

export default Product;