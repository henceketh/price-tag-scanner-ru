import mongoose from 'mongoose';

const extractedDataSchema = new mongoose.Schema({
  productName: String,
  price: Number,
  originalPrice: Number, 
  pricePerUnit: Number,
  unit: String,
  currency: String,
  barcode: String,
  brand: String,
  composition: String,
  expiryDate: String,
  isPromo: Boolean,
  promoType: String, 
  discountPercent: Number,
  rawText: String
}, { _id: false });

const scanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  imageData: {
    type: String 
  },
  originalText: {
    type: String,
    required: true
  },
  extractedData: extractedDataSchema,
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  model: {
    type: String,
    default: 'llava:34b'
  },
  processingTime: {
    type: Number 
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});


scanHistorySchema.index({ originalText: 'text' });

export default mongoose.model('ScanHistory', scanHistorySchema);
