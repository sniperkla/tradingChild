const axios = require('axios')

const apiBinance = require('./apibinance')

const leverageCal = async (
  symbol,
  priceCal,
  stopPriceCal,
  side,
  apiKey,
  secretKey
) => {
  let st = Math.abs(((priceCal - stopPriceCal) / stopPriceCal) * 100).toFixed(2)

  const defaultMargins = await apiBinance.getDefultMagin(apiKey, secretKey)

  const initialMargin = defaultMargins.filter((item) => {
    return item.asset === 'USDT'
  }) // get only USDT
  const defaultMargin = initialMargin[0].availableBalance

  let defaultLeverage = await apiBinance.getLeverageInitial(
    symbol,
    apiKey,
    secretKey
  )
  const askBid = await apiBinance.getMarketPrice(symbol, apiKey, secretKey)
  const markPrice = await apiBinance.getPrice(symbol, apiKey, secretKey)
  const haha = await apiBinance.getExchangeInfo(apiKey, secretKey)
  const getMarkPrice = await apiBinance.getMarkPrice(symbol, apiKey, secretKey)

  const x = haha.data.symbols.filter((item) => {
    return item.symbol === symbol
  })
  const min_Notional = x[0].filters.filter((item) => {
    return item.filterType === 'MIN_NOTIONAL'
  })

  let minimum = min_Notional[0].notional / markPrice

  if (minimum > 0.5) {
    minimum = Math.ceil(minimum)
  } else {
    //minimum = parseFloat(minimum.toFixed(3))
    minimum = Math.ceil(minimum * 1000) / 1000
  }

  let match = 0
  let running = 0

  if (minimum < 0.5) {
    match = parseInt(minimum.toString().match(/\.(\d*)/)[1].length)
    running = parseFloat(1 / Math.pow(10, match))
  } else {
    running = 1
  }

  let maximumQty = minimum
  const bids = parseFloat(askBid.bids[0][0])
  const asks = parseFloat(askBid.asks[0][0])
  const budget = defaultMargin * 0.02 || 2.5

  let leverage = budget * defaultLeverage * (st / 100)

  while (leverage > budget) {
    leverage = budget * defaultLeverage * (st / 100)
    if (leverage <= budget) {
      break
    }
    defaultLeverage--
  }

  let direction = 0
  let marketSize = 0
  let price = 0
  let valueAskBid = 0

  if (side === 'BUY') {
    const ask1 = asks * 0.0005
    valueAskBid = asks
    price = parseFloat(asks + ask1)
    direction = 1
  } else if (side === 'SELL') {
    valueAskBid = bids
    price = bids
    direction = -1
  }

  marketSize = (price * maximumQty) / defaultLeverage

  while (marketSize < budget) {
    marketSize = (price * maximumQty) / defaultLeverage

    if (marketSize >= budget) {
      break
    }
    maximumQty = maximumQty + running
  }

  // start here liqulid cal
  const getNotionalLv = await apiBinance.getNotionalLv(
    symbol,
    apiKey,
    secretKey
  )
  const brackets = getNotionalLv[0].brackets
  let Position1BOTH = maximumQty
  const calPositionBracket = price * maximumQty
  let openLongShort = calMargin(
    price,
    maximumQty,
    direction,
    priceCal,
    defaultLeverage
  )

  let cal = calLiquidlity(
    calPositionBracket,
    brackets,
    Position1BOTH,
    price,
    openLongShort.openLongShort,
    side
  )

  if (openLongShort.openLongShort < budget) {
    Position1BOTH = maximumQty
    cal = calLiquidlity(
      calPositionBracket,
      brackets,
      Position1BOTH,
      price,
      openLongShort.openLongShort,
      side
    )
    if (side === 'BUY') {
      if (cal > stopPriceCal) {
        console.log('StartMargin', openLongShort.openLongShort)
        console.log('StartLP', cal)
        console.log('stopPriceCal', stopPriceCal)
        console.log('StartMaxiumQty', maximumQty)
        while (cal > stopPriceCal) {
          maximumQty = maximumQty - running
          Position1BOTH = maximumQty
          cal = calLiquidlity(
            calPositionBracket,
            brackets,
            Position1BOTH,
            price,
            openLongShort.openLongShort,
            side
          )

          if (cal < stopPriceCal) {
            openLongShort = calMargin(
              price,
              maximumQty,
              direction,
              getMarkPrice,
              defaultLeverage
            )
            console.log('EndMaximumQty', maximumQty)
            console.log('EndLP', cal)
            console.log('EndMargin', openLongShort.openLongShort)

            return {
              maximumQty,
              defaultLeverage,
              st,
              budget,
              minimum,
              openLongShort,
              valueAskBid,
              price,
              bids,
              asks
            }
          }
        }
      } else {
        console.log('StartMargin', openLongShort.openLongShort)
        console.log('StartLP', cal)
        console.log('stopPriceCal', stopPriceCal)
        console.log('StartMaxiumQty', maximumQty)
        while (cal < stopPriceCal) {
          maximumQty = maximumQty + running
          Position1BOTH = maximumQty

          cal = calLiquidlity(
            calPositionBracket,
            brackets,
            Position1BOTH,
            price,
            openLongShort.openLongShort,
            side
          )
          if (cal > stopPriceCal) {
            maximumQty = maximumQty - running // เพิ่มมาใหม่
            openLongShort = calMargin(
              price,
              maximumQty,
              direction,
              getMarkPrice,
              defaultLeverage
            )
            console.log('EndMaximumQty', maximumQty)
            console.log('EndLP', cal)
            console.log('EndMargin', openLongShort.openLongShort)

            return {
              maximumQty,
              defaultLeverage,
              st,
              budget,
              minimum,
              openLongShort,
              valueAskBid,
              price,
              bids,
              asks
            }
          }
        }
      }
    } else if (side === 'SELL') {
      if (cal < stopPriceCal) {
        console.log('StartMargin', openLongShort.openLongShort)
        console.log('StartLP', cal)
        console.log('stopPriceCal', stopPriceCal)
        console.log('StartMaxiumQty', maximumQty)
        while (cal < stopPriceCal) {
          maximumQty = maximumQty - running
          Position1BOTH = maximumQty
          cal = calLiquidlity(
            calPositionBracket,
            brackets,
            Position1BOTH,
            price,
            openLongShort.openLongShort,
            side
          )

          if (cal > stopPriceCal) {
            openLongShort = calMargin(
              price,
              maximumQty,
              direction,
              getMarkPrice,
              defaultLeverage
            )
            console.log('EndMaximumQty', maximumQty)
            console.log('EndLP', cal)
            console.log('EndMargin', openLongShort.openLongShort)

            return {
              maximumQty,
              defaultLeverage,
              st,
              budget,
              minimum,
              openLongShort,
              valueAskBid,
              price,
              bids,
              asks
            }
          }
        }
      } else {
        console.log('StartMargin', openLongShort.openLongShort)
        console.log('StartLP', cal)
        console.log('stopPriceCal', stopPriceCal)
        console.log('StartMaxiumQty', maximumQty)
        while (cal > stopPriceCal) {
          maximumQty = maximumQty + running
          Position1BOTH = maximumQty
          cal = calLiquidlity(
            calPositionBracket,
            brackets,
            Position1BOTH,
            price,
            openLongShort.openLongShort,
            side
          )

          if (cal < stopPriceCal) {
            maximumQty = maximumQty - running // เพิ่มมาใหม่

            openLongShort = calMargin(
              price,
              maximumQty,
              direction,
              getMarkPrice,
              defaultLeverage
            )
            console.log('EndMaximumQty', maximumQty)
            console.log('EndLP', cal)
            console.log('EndMargin', openLongShort.openLongShort)

            return {
              maximumQty,
              defaultLeverage,
              st,
              budget,
              minimum,
              openLongShort,
              valueAskBid,
              price,
              bids,
              asks
            }
          }
        }
      }
    }
  } else {
    while (openLongShort.openLongShort > budget) {
      maximumQty = maximumQty - running
      openLongShort = calMargin(
        price,
        maximumQty,
        direction,
        getMarkPrice,
        defaultLeverage
      )
      if (openLongShort.openLongShort < budget) {
        Position1BOTH = maximumQty
        calLiquidlity(
          calPositionBracket,
          brackets,
          Position1BOTH,
          price,
          openLongShort.openLongShort,
          side
        )
        if (side === 'BUY') {
          if (cal > stopPriceCal) {
            console.log('StartMargin', openLongShort.openLongShort)
            console.log('StartLP', cal)
            console.log('stopPriceCal', stopPriceCal)
            console.log('StartMaxiumQty', maximumQty)
            while (cal > stopPriceCal) {
              Position1BOTH = maximumQty
              cal = calLiquidlity(
                calPositionBracket,
                brackets,
                Position1BOTH,
                price,
                openLongShort.openLongShort,
                side
              )
              maximumQty = maximumQty - running
            }

            if (cal < stopPriceCal) {
              openLongShort = calMargin(
                price,
                maximumQty,
                direction,
                getMarkPrice,
                defaultLeverage
              )
              console.log('EndMaximumQty', maximumQty)
              console.log('EndLP', cal)
              console.log('EndMargin', openLongShort.openLongShort)

              return {
                maximumQty,
                defaultLeverage,
                st,
                budget,
                minimum,
                openLongShort,
                valueAskBid,
                price,
                bids,
                asks
              }
            }
          } else {
            console.log('StartMargin', openLongShort.openLongShort)
            console.log('StartLP', cal)
            console.log('stopPriceCal', stopPriceCal)
            console.log('StartMaxiumQty', maximumQty)

            while (cal < stopPriceCal) {
              maximumQty = maximumQty + running
              Position1BOTH = maximumQty

              cal = calLiquidlity(
                calPositionBracket,
                brackets,
                Position1BOTH,
                price,
                openLongShort.openLongShort,
                side
              )

              if (cal > stopPriceCal) {
                maximumQty = maximumQty - running // เพิ่มมาใหม่
                openLongShort = calMargin(
                  price,
                  maximumQty,
                  direction,
                  getMarkPrice,
                  defaultLeverage
                )
                console.log('EndMaximumQty', maximumQty)
                console.log('EndLP', cal)
                console.log('EndMargin', openLongShort.openLongShort)

                return {
                  maximumQty,
                  defaultLeverage,
                  st,
                  budget,
                  minimum,
                  openLongShort,
                  valueAskBid,
                  price,
                  bids,
                  asks
                }
              }
            }
          }
        } else if (side === 'SELL') {
          if (cal < stopPriceCal) {
            console.log('StartMargin', openLongShort.openLongShort)
            console.log('StartLP', cal)
            console.log('stopPriceCal', stopPriceCal)
            console.log('StartMaxiumQty', maximumQty)
            while (cal < stopPriceCal) {
              maximumQty = maximumQty - running
              Position1BOTH = maximumQty
              cal = calLiquidlity(
                calPositionBracket,
                brackets,
                Position1BOTH,
                price,
                openLongShort.openLongShort,
                side
              )

              if (cal > stopPriceCal) {
                openLongShort = calMargin(
                  price,
                  maximumQty,
                  direction,
                  getMarkPrice,
                  defaultLeverage
                )
                console.log('EndMaximumQty', maximumQty)
                console.log('EndLP', cal)
                console.log('EndMargin', openLongShort.openLongShort)

                return {
                  maximumQty,
                  defaultLeverage,
                  st,
                  budget,
                  minimum,
                  openLongShort,
                  valueAskBid,
                  price,
                  bids,
                  asks
                }
              }
            }
          } else {
            console.log('StartMargin', openLongShort.openLongShort)
            console.log('StartLP', cal)
            console.log('stopPriceCal', stopPriceCal)
            console.log('StartMaxiumQty', maximumQty)
            while (cal > stopPriceCal) {
              maximumQty = maximumQty + running

              Position1BOTH = maximumQty
              cal = calLiquidlity(
                calPositionBracket,
                brackets,
                Position1BOTH,
                price,
                openLongShort.openLongShort,
                side
              )
              if (cal < stopPriceCal) {
                maximumQty = maximumQty - running // เพิ่มมาใหม่
                openLongShort = calMargin(
                  price,
                  maximumQty,
                  direction,
                  getMarkPrice,
                  defaultLeverage
                )
                console.log('EndMaximumQty', maximumQty)
                console.log('EndLP', cal)
                console.log('EndMargin', openLongShort.openLongShort)

                return {
                  maximumQty,
                  defaultLeverage,
                  st,
                  budget,
                  minimum,
                  openLongShort,
                  valueAskBid,
                  price,
                  bids,
                  asks
                }
              }
            }
          }
        }
      }
    }
  }
}

module.exports = {
  leverageCal
}
const calMargin = (
  price,
  maximumQty,
  direction,
  getMarkPrice,
  defaultLeverage
) => {
  const bidsAsksCost = (price * maximumQty) / defaultLeverage

  const openloss =
    maximumQty * Math.abs(direction * (0 - (getMarkPrice - price)))

  const openLongShort = bidsAsksCost + openloss

  return { openLongShort, openloss, bidsAsksCost }
}

const calLiquidlity = (
  calPositionBracket,
  brackets,
  Position1BOTH,
  price,
  openLongShort,
  side
) => {
  const findCum = findPositionBracket(calPositionBracket, brackets)
  const WB = openLongShort
  const TMM1 = 0
  const UPNL1 = 0
  const cumB = findCum[0].cum
  const cumL = 0
  const cumS = 0
  const Side1BOTH = side === 'BUY' ? 1 : -1
  const EP1BOTH = price
  const Position1LONG = 0
  const EP1LONG = 0
  const Position1SHORT = 0
  const EP1SHORT = 0
  const MMRB = findCum[0].maintMarginRatio
  const MMRL = 0
  const MMRS = 0
  let LP = 0
  const LP1 =
    WB -
    (TMM1 + UPNL1 + cumB + cumL + cumS) -
    Side1BOTH * Position1BOTH * EP1BOTH -
    Position1LONG * EP1LONG +
    Position1SHORT * EP1SHORT
  const LP2 =
    Position1BOTH * MMRB +
    Position1LONG * MMRL +
    Position1SHORT * MMRS -
    Side1BOTH * Position1BOTH -
    Position1LONG +
    Position1SHORT

  LP = LP1 / LP2

  return LP
}

// debug
// console.log('Margin', budget)
// console.log('Leverage', defaultLeverage)
// console.log('st%', st)
// console.log('asksBids', price)
// console.log('MinimumQty', minimum)
// console.log(
//   'Size Qty Long และ Size Qty Short (ขั้นตอนหา Maximum Qty)',
//   maximumQty
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 2)',
//   openLongShort.bidsAsksCost
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 3)',
//   openLongShort.openloss
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 4)',
//   openLongShort.openLongShort
// )
// console.log('mark price ของฟิวเจอ ', markPrice)
// console.log('mark price spot', getMarkPrice)
// console.log('mark price ask[0] ที่ยังไม่คำนวน', asks)
// console.log('mark price bid[0] ที่ยังไม่คำนวน', bids)
// console.log('Margin', budget)
// console.log('Leverage', defaultLeverage)
// console.log('st%', st)
// console.log('asksBids', price)
// console.log('MinimumQty', minimum)
// console.log(
//   'Size Qty Long และ Size Qty Short (ขั้นตอนหา Maximum Qty)',
//   maximumQty
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 2)',
//   openLongShort.bidsAsksCost
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 3)',
//   openLongShort.openloss
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 4)',
//   openLongShort.openLongShort
// )
// console.log('mark price ของฟิวเจอ ', markPrice)
// console.log('mark price spot', getMarkPrice)
// console.log('mark price ask[0] ที่ยังไม่คำนวน', asks)
// console.log('mark price bid[0] ที่ยังไม่คำนวน', bids)

// console.log('Leverage', defaultLeverage)
// console.log('st%', st)
// console.log('asksBids', price)
// console.log('MinimumQty', minimum)
// console.log(
//   'Size Qty Long และ Size Qty Short (ขั้นตอนหา Maximum Qty)',
//   maximumQty
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 2)',
//   openLongShort.bidsAsksCost
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 3)',
//   openLongShort.openloss
// )
// console.log(
//   'Calculate Margin Long  และ Calculate Margin Short (ขั้นตอนที่ 4)',
//   openLongShort.openLongShort
// )
// console.log('mark price ของฟิวเจอ ', markPrice)
// console.log('mark price spot', getMarkPrice)
// console.log('mark price ask[0] ที่ยังไม่คำนวน', asks)
// console.log('mark price bid[0] ที่ยังไม่คำนวน', bids)
const findPositionBracket = (calPositionBracket, brackets) => {
  const findBrackets = brackets.filter((item) => {
    return (
      calPositionBracket >= item.notionalFloor &&
      calPositionBracket <= item.notionalCap
    )
  })

  return findBrackets
}
