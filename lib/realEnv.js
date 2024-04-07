const axios = require('axios')
const Log = require('../model/log')

const apiBinance = require('./apibinance')
const lineNotifyPost = require('./lineNotifyPost')
const buyingBinance = async (body) => {
  try {
    const {
      symbol,
      side,
      type,
      takeProfit,
      quantity,
      stopPriceCal,
      leverage,
      budget,
      minimum,
      openLongShort,
      st,
      valueAskBid,
      price,
      bids,
      asks,
      apiKey,
      secretKey
    } = body
    const status = true
    await apiBinance.changeMarginType(symbol, apiKey, secretKey)
    await apiBinance.changeLeverage(symbol, leverage, apiKey, secretKey)

    const binanceMarket = await apiBinance.postBinannce(
      symbol,
      side,
      quantity,
      type,
      stopPriceCal,
      status,
      takeProfit.takeprofit,
      apiKey,
      secretKey
    )

    if (binanceMarket.status === 400) {
      const buyit = {
        symbol: symbol,
        text: 'error',
        type: type,
        msg: binanceMarket.data.msg
      }
      await lineNotifyPost.postLineNotify(buyit)
    } else if (binanceMarket.status === 200) {
      const log = await Log.findOne({ symbol: symbol })
      if (!log) {
        await createLog(symbol, side, takeProfit, binanceMarket?.data)
      }
      const defaultMargins = await apiBinance.getDefultMagin(apiKey, secretKey)
      const initialMargin = defaultMargins.filter((item) => {
        return item.asset === 'USDT'
      }) // get only USDT
      const defaultMargin = initialMargin[0].balance
      const buyit = {
        text: 'buy',
        text2: 'สรุปคำส้งซื้อ',
        symbol: symbol,
        quantity: quantity,
        leverage: leverage,
        budget: budget,
        minimum: minimum,
        openLongShort: openLongShort.openLongShort,
        st: st,
        defaultMargin: defaultMargin,
        stopPriceCal: stopPriceCal,
        takeProfit: takeProfit.takeprofit,
        side: side,
        valueAskBid: valueAskBid,
        price: price,
        bids: bids,
        asks: asks
      }
      await lineNotifyPost.postLineNotify(buyit)
    }

    const binanceTakeProfit = await apiBinance.postBinannce(
      takeProfit.symbol,
      takeProfit.side,
      quantity,
      takeProfit.type,
      stopPriceCal,
      status,
      takeProfit.takeprofit,
      apiKey,
      secretKey
    )

    if (binanceTakeProfit.status === 200) {
      const buyit = {
        text: 'takeprofit',
        symbol: symbol,
        type: 'TAKE_PROFIT_MARKET',
        msg: 'ตั้ง TakeProfit สำเร็จ!!'
      }
      await updateLogTakeProfit(symbol, binanceTakeProfit.data)
      await lineNotifyPost.postLineNotify(buyit)

      // const check = await Log.findOne({ symbol: symbol, side: side })
      // if (check) {
      //   await Log.updateOne({ symbol: symbol, side }, data, {
      //     upsert: true
      //   })
      //   await apiBinance.cancleOrder(symbol, check.binanceTakeProfit.orderId)
      //   console.log('cancle order')
      // } else {
      //   const logCreated = await Log.create(data)
      // }
    } else if (binanceTakeProfit.status === 400) {
      const buyit = {
        text: 'error',
        symbol: takeProfit.symbol,
        type: takeProfit.type,
        msg: binanceTakeProfit.data.msg
      }
      await lineNotifyPost.postLineNotify(buyit)
    }

    const binanceStopLoss = await apiBinance.postBinannce(
      symbol,
      takeProfit.side,
      quantity,
      'STOP_MARKET',
      stopPriceCal,
      status,
      takeProfit.takeprofit,
      apiKey,
      secretKey
    )

    if (binanceStopLoss.status === 200) {
      const buyit = {
        text: 'stoplossfirst',
        symbol: symbol,
        type: 'STOP_MARKET',
        msg: 'ตั้ง StopLoss สำเร็จ!!'
      }
      await updateLogStopLoss(symbol, binanceStopLoss.data)
      await lineNotifyPost.postLineNotify(buyit)
    } else if (binanceStopLoss.status === 400) {
      const buyit = {
        text: 'error',
        symbol: symbol,
        type: 'STOP_MARKET',
        msg: binanceStopLoss.data.msg
      }
      await lineNotifyPost.postLineNotify(buyit)
    }

    //not now wait for the real enveronment
  } catch (error) {
    console.log('post', error.response.data.msg)
  }
}

module.exports = { buyingBinance }

const createLog = async (symbol, side, takeProfit, datas) => {
  let data = {
    symbol: symbol,
    side: side,
    status: 'BUYING',
    takeProfit: takeProfit,
    binanceMarket: datas,
    binanceTakeProfit: {},
    binanceStopLoss: {}
  }
  const logCreated = await Log.create(data)
}

const updateLogStopLoss = async (symbol, data) => {
  const updated = await Log.updateOne(
    { symbol: symbol },
    { $set: { binanceStopLoss: data } }
  )
}

const updateLogTakeProfit = async (symbol, data) => {
  const updated = await Log.updateOne(
    { symbol: symbol },
    { $set: { binanceTakeProfit: data } }
  )
}
