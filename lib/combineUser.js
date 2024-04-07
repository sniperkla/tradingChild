require('dotenv').config()

const combineUser = () => {
  const APIKEY = process.env.APIKEY.split(',')
  const SECRETKEY = process.env.SECRETKEY.split(',')

  const combine = { API_KEY: APIKEY, SECRET_KEY: SECRETKEY }

  return combine
}

module.exports = { combineUser }
