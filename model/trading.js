const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Trading = new Schema(
  {
    type: { type: String },
    side: { type: String },
    symbol: { type: String },
    takeProfit: { type: Object },
    time: { type: Date, default: Date.now },
    stopPrice: { type: String },
    priceCal: { type: String },
    stopPriceCal: { type: String }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Trading', Trading)
