const express = require('express')
const HTTPStatus = require('http-status')
const app = express()
const port = 80
const cors = require('cors')
const bodyParser = require('body-parser')
const Trading = require('./model/trading')
const Log = require('./model/log')
const lineNotifyPost = require('./lib/lineNotifyPost')
const apiBinance = require('./lib/apibinance')
const callLeverage = require('./lib/calLeverage')
const realEnvironment = require('./lib/realEnv')
const combine = require('./lib/combineUser')
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const mongoose = require('mongoose')
// const connectionString = 'mongodb://admin:AaBb1234!@27.254.144.100/trading'
const connectionString = 'mongodb://localhost:27017/trading'

mongoose
  .connect(connectionString, {
    useNewUrlParser: true
  })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('Error connecting to MongoDB:', err))
let bodyq = null
app.get('/getbinance', async (req, res) => {
  try {
    return res.status(HTTPStatus.OK).json({ success: true, data: 'running' })
  } catch (error) {}
})

app.post('/gettrading', async (req, res) => {
  try {
    bodyq = req.body

    let body = await checkDataFirst(bodyq)

    const checkMarket = await Log.findOne({
      symbol: body.symbol
    })
    if (checkMarket) {
      const checkTakeOrCancle = await apiBinance.getOrder(
        checkMarket?.binanceTakeProfit?.orderId,
        body.symbol
      )
      if (
        checkTakeOrCancle?.status === 'CANCELED' ||
        checkTakeOrCancle?.status === 'CLOSED' ||
        checkTakeOrCancle?.status === 'EXPIRED'
      ) {
        await Log.findOneAndDelete({ symbol: body.symbol })
      }
    }

    if (body.type === 'MARKET') {
      const checkMarketFirst = await Log.findOne({ symbol: body.symbol })
      const get = combine.combineUser()
      if (!checkMarketFirst) {
        const calLeverage = await callLeverage.leverageCal(
          body.symbol,
          body.priceCal,
          body.stopPriceCal,
          body.side,
          get.API_KEY[0],
          get.SECRET_KEY[0]
        )

        checkCondition(
          body,
          res,
          calLeverage.maximumQty,
          calLeverage.defaultLeverage,
          calLeverage.budget,
          calLeverage.minimum,
          calLeverage.openLongShort,
          calLeverage.st,
          calLeverage.valueAskBid,
          calLeverage.price,
          calLeverage.bids,
          calLeverage.asks
        )
      } else console.log('arleady have market')
    } else checkCondition(body, res)

    return res.status(HTTPStatus.OK).json({ success: true, data: 'ok' })
  } catch (error) {}
})

const checkCondition = async (
  body,
  res,
  maximumQty,
  defaultLeverage,
  budget,
  minimum,
  openLongShort,
  st,
  valueAskBid,
  price,
  bids,
  asks
) => {
  try {
    const finalBody = {
      ...body,
      quantity: maximumQty,
      leverage: defaultLeverage,
      budget: budget,
      minimum: minimum,
      openLongShort: openLongShort,
      st: st,
      valueAskBid: valueAskBid,
      price: price,
      bids: bids,
      asks: asks
    }

    const checkLog = await Log.findOne({
      symbol: finalBody.symbol
    })

    if (
      (finalBody.type === 'STOP_MARKET' && checkLog) ||
      finalBody.type === 'MARKET'
    ) {
      // for (const user of get)
      await lineNotifyPost.postLineNotify(lineNotify(finalBody))
    }

    if (body.type === 'MARKET') {
      const get = combine.combineUser()

      // for (let i = 0; i < 2; i++) {
      let en = {
        ...finalBody,
        apiKey: get.API_KEY[0],
        secretKey: get.SECRET_KEY[0]
      }

      await realEnvironment.buyingBinance(en)
      // }
    } else if (body.type === 'STOP_MARKET') {
      await checkStopLoss(body)
    }

    return res.status(HTTPStatus.OK).json({ success: true, data: 'ไม่ๆๆๆ' })
  } catch (error) {}
}

const checkStopLoss = async (body) => {
  try {
    const { symbol, side, type, stopPrice } = body

    const qty = 0
    const status = true

    // check order first
    const checkMarket = await Log.findOne({
      symbol: symbol
    })

    const check = await Log.findOne({
      'symbol': symbol,
      'binanceStopLoss.symbol': symbol
    })

    if (check) {
      const data = await apiBinance.postBinannce(
        symbol,
        side,
        qty,
        type,
        stopPrice,
        status
      )
      if (data.status === 200) {
        await apiBinance.cancleOrder(symbol, check.binanceStopLoss.orderId)
        await Log.findOneAndUpdate(
          { symbol: symbol },
          {
            $set: { binanceStopLoss: data.data }
          },
          { upsert: true }
        )
        const updated = await Log.updateOne(
          { symbol: symbol },
          { $set: { binanceStopLoss: data.data } }
        )
        const buyit = {
          symbol: symbol,
          text: 'updatestoploss',
          type: type,
          msg: `${symbol} : อัพเดท stoploss สำเร็จ , เลื่อน stopLoss : ${stopPrice}`
        }
        await lineNotifyPost.postLineNotify(buyit)
      } else if (data.status !== 200 && checkMarket) {
        const buyit = {
          symbol: symbol,
          text: 'error',
          type: type,
          msg: data.data.msg
        }
        await lineNotifyPost.postLineNotify(buyit)
      }
    } else if (checkMarket !== null && check === null) {
      const data = await apiBinance.postBinannce(
        symbol,
        side,
        qty,
        type,
        stopPrice,
        status
      )

      if (data.status === 200) {
        const updated = await Log.updateOne(
          { symbol: symbol },
          { $set: { binanceStopLoss: data.data } }
        )

        const buyit = {
          symbol: symbol,
          text: 'updatestoploss',
          type: type,
          msg: `${symbol} : อัพเดท stoploss สำเร็จ , เลื่อน stopLoss : ${stopPrice}`
        }
        await lineNotifyPost.postLineNotify(buyit)
      } else {
        const buyit = {
          symbol: symbol,
          text: 'error',
          type: type,
          msg: data.data.msg
        }
        await lineNotifyPost.postLineNotify(buyit)
      }
    }

    // } else {
    //   const buyit = {
    //     symbol: symbol,
    //     text: 'checkstoploss',
    //     type: type,
    //     msg: 'ยังไม่มีคำสั่งซื้อ'
    //   }
    //   await lineNotifyPost.postLineNotify(buyit)
    // }
  } catch (error) {}
}

const lineNotify = (body) => {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  const buyit = {
    symbol: body.symbol,
    side: body.side,
    type: body.type,
    price: body.priceCal,
    takeProfit: body.takeProfit,
    stopPrice: body.stopPrice,
    time: `${hours}:${minutes}:${seconds}`
  }
  return buyit
}

const checkMarketBody = (body) => {
  let real = {}

  const filteredBody = body.filter((item) => item.hasOwnProperty('takeprofit'))

  real = {
    type: body[0].type,
    side: body[0].side,
    symbol: body[0].symbol,
    takeProfit: filteredBody[0],
    priceCal: body[0].priceCal,
    stopPriceCal: body[0].stopPriceCal
  }

  return real
}

const checkStopLossBody = (bodyq) => {
  let real = {}

  real = {
    type: bodyq.type,
    side: bodyq.side,
    symbol: bodyq.symbol,
    price: bodyq.priceCal,
    stopPrice: bodyq.stopPrice
  }

  return real
}

const checkDataFirst = async (bodyq) => {
  if (bodyq[0]?.type === 'MARKET') {
    const modifiedBody = bodyq.map((item) => ({
      ...item,
      symbol: item.symbol.replace(/\.P$/, '')
    }))

    const bodyMarket = checkMarketBody(modifiedBody)

    const checkData = await Trading.findOne({
      symbol: bodyMarket.symbol,
      type: bodyMarket.type
    })

    if (checkData) {
      await Trading.updateOne(
        {
          symbol: bodyMarket.symbol,
          type: bodyMarket.type
        },
        bodyMarket,
        { upsert: true }
      )
    }
    if (!checkData) await Trading.create(bodyMarket)

    return bodyMarket
  } else if (bodyq?.type === 'STOP_MARKET') {
    let body = {
      ...bodyq,
      symbol: bodyq.symbol.replace(/\.P$/, '')
    }
    const bodyStopLoss = checkStopLossBody(body)

    return bodyStopLoss
  }
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
