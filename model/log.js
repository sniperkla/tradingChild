const mongoose = require('mongoose')
const Schema = mongoose.Schema

const Log = new Schema(
  {
    symbol: { type: String },
    side: { type: String },
    status: { type: String },
    price: { type: String },
    takeProfit: { type: Object },
    time: { type: Date, default: Date.now },
    binanceTakeProfit: { type: Object },
    binanceMarket: { type: Object },
    binanceStopLoss: { type: Object }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('Log', Log)
