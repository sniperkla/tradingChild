const axios = require('axios')
const CryptoJS = require('crypto-js')

// const secretKey =
//   'BsQz8b7rhgbP2L2yxPu7G4b3OGpwODQrUq0HCcIqTsxwV3DvvzEAhthhDNf2xlBd'
// const apiKey =
//   'fk5hgsDkyZAm32AyurlsrKGBXzhSjFzK8WnbGyxofpj3snembQZUqn1roQAMNWjU'

// let api_url = 'https://fapi.binance.com/fapi/v1'
// let api_urlv2 = 'https://fapi.binance.com/fapi/v2'

// test

// test
// const secretKey =
//   'dd26cb44c196940b34ec3a6572f6dcb239f1f7db9d2ca88ca5ab51713247c633'
// const apiKey =
//   '7f7fd1a0ea938e0ee613daa36d585b7c2474ab068b96168148af108d0a11007c'
let api_url = 'https://testnet.binancefuture.com/fapi/v1'
let api_urlv2 = 'https://testnet.binancefuture.com/fapi/v2'

function generateSignature(secretKey, queryString) {
  const hmac = CryptoJS.HmacSHA256(queryString, secretKey)
  const signature = hmac.toString(CryptoJS.enc.Hex) // Convert to uppercase (as required by Binance)

  return signature
}

const postBinannce = async (
  symbol,
  side,
  quantity,
  type,
  stopPriceCal,
  status,
  takeprofit,
  apiKey,
  secretKey
) => {
  const timestamp = Date.now()
  let orderpath = ''
  if (status === true) {
    orderpath = '/order?' 
  } else if (status === false) {
    orderpath = '/order/test?'
  }

  const getExchange = await getExchangeInfo(apiKey, secretKey)

  const value = getExchange.data.symbols.filter((item) => {
    return item.symbol === symbol
  })
  const pricePrecision = value[0].pricePrecision
  const qtyPrecision = value[0].quantityPrecision

  let params = {}
  if (type === 'LIMIT') {
    params = {
      symbol: symbol, // Replace with your symbol
      side: side, // Assuming you have a long position (buying)
      type: 'TAKE_PROFIT_MARKET',
      //  quantity: quantity.toFixed(3), // From retrieved position info
      // positionSide: positionSide, // follow buy
      stopprice: parseFloat(takeprofit).toFixed(pricePrecision),
      timeInForce: 'GTE_GTC',
      timestamp: timestamp,
      closePosition: true,
      workingType: 'MARK_PRICE'
    }
  } else if (type === 'MARKET') {
    params = {
      symbol: symbol,
      side: side,
      type: 'MARKET',
      // positionSide: positionSide,
      quantity: quantity.toFixed(qtyPrecision),
      timestamp: timestamp
    }
  } else if (type === 'STOP_MARKET') {
    params = {
      symbol: symbol, // Replace with your symbol
      side: side, // Assuming you have a long position (buying)
      // positionSide: positionSide,
      type: 'STOP_MARKET',
      stopPrice: parseFloat(stopPriceCal).toFixed(pricePrecision),
      timeInForce: 'GTC',
      timestamp: timestamp,
      closePosition: true,
      workingType: 'MARK_PRICE'
    }
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}${orderpath}${queryString}&signature=${signature}`

  let response = {}
  try {
    response = await axios.post(url, null, {
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return response // Log the API response
  } catch (error) {
    // await lineNotifyPost.postLineNotify(buyit)
    console.log(
      `Error sending Binance API request at ${type} `,
      error.response.data
    )
    return error.response
  }
}

const cancleOrder = async (symbol, orderId) => {
  const timestamp = Date.now()

  const params = {
    symbol: symbol,
    orderId: orderId,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/order?${queryString}&signature=${signature}`
  try {
    const response = await axios.delete(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    // console.log(response.data) // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request:', error.data)
  }
}

const getPrice = async (symbol, apiKey, secretKey) => {
  const timestamp = Date.now()

  const params = {
    symbol: symbol,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/ticker/price?${queryString}&signature=${signature}`
  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data.price
  } catch (error) {
    console.error('Error sending Binance API request:', error)
  }
}

const getMarketPrice = async (symbol, apiKey, secretKey) => {
  const params = {
    symbol: symbol,
    limit: 5
    // timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/depth?${queryString}&signature=${signature}`
  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data
    // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request:', error.data)
  }
}

const changeLeverage = async (symbol, leverage, apiKey, secretKey) => {
  const timestamp = Date.now()
  const params = {
    symbol: symbol,
    leverage: leverage,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/leverage?${queryString}&signature=${signature}`
  try {
    const response = await axios.post(url, null, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data
    // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request:', error.response.data)
    return error.response
  }
}

const getFundingRate = async (symbol) => {
  const timestamp = Date.now()
  const params = {
    symbol: symbol,
    limit: 1
    // timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/fundingRate?${queryString}&signature=${signature}`
  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data

    // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request:', error.response.data)
  }
}

const getLeverageInitial = async (symbol, apiKey, secretKey) => {
  const timestamp = Date.now()
  const params = {
    symbol: symbol,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/leverageBracket?${queryString}&signature=${signature}`
  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data[0].brackets[0].initialLeverage

    // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request:', error.response.data)
  }
}

const getDefultMagin = async (apiKey, secretKey) => {
  const timestamp = Date.now()

  const params = {
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_urlv2}/balance?${queryString}&signature=${signature}`

  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data // Log the API response
  } catch (error) {
    console.log('Error sending Binance API request:', error)
  }
}

const changeMarginType = async (symbol, apiKey, secretKey) => {
  const timestamp = Date.now()

  const params = {
    symbol: symbol,
    marginType: 'ISOLATED',
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/marginType?${queryString}&signature=${signature}`

  try {
    const response = await axios.post(url, null, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request: ', error.data)
  }
}

const getExchangeInfo = async (apiKey, secretKey) => {
  const timestamp = Date.now()

  const params = {
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/exchangeInfo?${queryString}&signature=${signature}`

  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request: ', error.data)
  }
}

const getMarkPrice = async (symbol, apiKey, secretKey) => {
  const timestamp = Date.now()

  const params = {
    symbol: symbol,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/premiumIndex?${queryString}&signature=${signature}`

  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data.markPrice // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request kkk: ', error.data)
  }
}

const getOrder = async (orderId, symbol) => {
  const timestamp = Date.now()

  const params = {
    symbol: symbol,
    orderId: orderId,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/order?${queryString}&signature=${signature}`

  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request kkk: ', error.data)
  }
}

const getNotionalLv = async (symbol, apiKey, secretKey) => {
  const timestamp = Date.now()

  const params = {
    symbol: symbol,
    timestamp: timestamp
  }
  const queryString = Object.keys(params)
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const signature = generateSignature(secretKey, queryString)

  const url = `${api_url}/leverageBracket?${queryString}&signature=${signature}`

  try {
    const response = await axios.get(url, {
      // Send an empty body for POST requests in Binance Futures API
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data // Log the API response
  } catch (error) {
    console.error('Error sending Binance API request kkk: ', error)
  }
}
module.exports = {
  getPrice,
  postBinannce,
  cancleOrder,
  getMarketPrice,
  changeLeverage,
  getFundingRate,
  getLeverageInitial,
  getDefultMagin,
  changeMarginType,
  getExchangeInfo,
  getMarkPrice,
  getOrder,
  getNotionalLv
}
