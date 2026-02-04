import mongoose from 'mongoose';

const priceHistorySchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true
  },
  originalPrice: {
    type: Number
  },
  currency: {
    type: String,
    default: 'RUB'
  },
  isPromo: {
    type: Boolean,
    default: false
  },
  store: {
    type: String,
    trim: true
  },
  scannedAt: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScanHistory'
  }
});

const productSchema = new mongoose.Schema({
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    trim: true
  },
  priceHistory: [priceHistorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ name: 'text', brand: 'text' });

productSchema.pre('save', function() {
  this.updatedAt = new Date();
});

productSchema.methods.getCurrentPrice = function() {
  if (this.priceHistory.length === 0) return null;
  return this.priceHistory[this.priceHistory.length - 1];
};

productSchema.methods.getMinPrice = function() {
  if (this.priceHistory.length === 0) return null;
  return Math.min(...this.priceHistory.map(p => p.price));
};

productSchema.methods.getMaxPrice = function() {
  if (this.priceHistory.length === 0) return null;
  return Math.max(...this.priceHistory.map(p => p.price));
};

productSchema.methods.getAvgPrice = function() {
  if (this.priceHistory.length === 0) return null;
  const sum = this.priceHistory.reduce((acc, p) => acc + p.price, 0);
  return sum / this.priceHistory.length;
};

export default mongoose.model('Product', productSchema);
