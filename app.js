if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
// require module
const methodOverride = require('method-override')
const session = require('express-session')
const express = require('express')
const cors = require('cors')

// for line bot
const { TextToSpeechClient } = require('@google-cloud/text-to-speech')
const fs = require('fs')
const line = require('@line/bot-sdk')
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
}
// for line bot

// for openAI
const { Configuration, OpenAIApi } = require('openai')
const configuration = new Configuration({
  organization: process.env.ORGANIZATION_ID,
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration)

// for openAI

// require self-made module
const passport = require('./config/passport')
const { apis } = require('./routes')

// app setting
const app = express()
const port = process.env.PORT || 4000

// for line bot
function GENMSG (str) {
  this.type = 'text'
  this.text = str
}
function GENSTICKER (packageId, stickerId) {
  this.type = 'sticker'
  this.packageId = packageId
  this.stickerId = stickerId
}
function GENADDRESS (title, address, latitude, longitude) {
  this.type = 'location'
  this.title = title
  this.address = address
  this.latitude = latitude
  this.longitude = longitude
}
const client = new line.Client(config)

// client.pushMessage(process.env.CHANNEL_ID, new GENSTICKER(1,1))
// client.pushMessage(process.env.CHANNEL_ID, new GENMSG('推播通知'))
// 監聽
async function handleEvent (event) {
  if (event.type === 'message' && event.message.type === 'text') {
    console.log(event.message.text)
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: event.message.text }]
    })
    const response2 = await openai.createImage({
      prompt: '貓咪',
      n: 2,
      size: '1024x1024'
    })
    console.log(response2.data.data[0].url)
    return client
      .replyMessage(
        event.replyToken,
        new GENMSG(response.data.choices[0].message.content)
      )
      .then(() => {
        event.message.text = ''
        console.log('message sent!')
      })
      .catch(err => {
        console.error(err)
      })
  }
}
app.use('/webhook', line.middleware(config))
app.post('/webhook', (req, res) => {
  const events = req.body.events
  const lastEvent = events[events.length - 1]

  handleEvent(lastEvent)
    .then(result => {
      console.log(result)
      res.json(result)
    })
    .catch(err => {
      console.error('error at app.post', err)
    })
})

// for line bot
app.use(express.urlencoded({ extended: true }))// req.body
app.use(methodOverride('_method'))
app.use(express.json())// json
app.use(cors())
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
)
app.use(passport.initialize())
app.use(passport.session())

app.use((req, res, next) => {
  req.session.messages = [] // 重設錯誤訊息
  next()
})
app.get('/', (req, res) => {
  res.send('hello')
})
app.use('/api', apis)

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app
