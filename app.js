if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
// require module
const methodOverride = require('method-override')
const session = require('express-session')
const express = require('express')
const cors = require('cors')

// for line bot
const line = require('@line/bot-sdk')
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}
// for line bot

// require self-made module
const passport = require('./config/passport')
const { apis } = require('./routes')

// app setting
const app = express()
const port = process.env.PORT || 4000
app.use(express.urlencoded({ extended: true }))// req.body
app.use(methodOverride('_method'))
app.use(express.json())// json
app.use(cors())

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}))
app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
  req.session.messages = [] // 重設錯誤訊息
  next()
})

// for line bot
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => console.error(err))
})

const client = new line.Client(config)

function handleEvent (event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null)
  }

  const message = {
    type: 'text',
    text: `You said: ${event.message.text}`
  }

  return client.replyMessage(event.replyToken, message)
}
// for line bot

app.use('/api', apis)

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app
