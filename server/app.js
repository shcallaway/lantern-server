const express = require('express')
const morgan = require('morgan')
const path = require('path')
const chalk = require('chalk')
const s3 = require('aws-sdk/clients/s3')
const dotenv = require('dotenv')
const sass = require('node-sass-middleware')
const database = require('./database')

// Set up environment vars
dotenv.config()

// The AWS SDK automatically finds credentials from environment vars
const client = new s3({
  params: {
    Bucket: process.env.AWS_BUCKET // But we have to explicitly provide this
  }
})

// Initialize the server
const app = express()

// Setup logging
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'))

// Setup sass middleware
app.use(sass({
  // debug: true,
  src:  path.resolve(__dirname, '../client/public/sass'),
  dest: path.resolve(__dirname, '../client/public'),
  indentedSyntax: true,
  outputStyle: 'compressed'
}));

// Serve static assets
app.use(express.static(path.resolve(__dirname, '../client/build')))

app.use((req, res, next) => {

  // Enable CORS for all requests
  res.header("Access-Control-Allow-Origin", "*")
  // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  // Log the request details
  process.stdout.write('REQUEST RECEIVED: ')
  console.log(chalk.blue(`${req.method} ${req.url}`))

  // Forward request on
  next()
})

// Declare server-side routes
app.get('/tracks', (req, res) => {

  // Query the database for all tracks
  database.query('SELECT * FROM tracks', (error, results, fields) => {

    // Handle any errors
    if (error) {
      process.stdout.write('DB ERROR: ')
      console.log(chalk.red(error.code))
      return res.sendStatus(500)
    }

    const tracks = results
    
    // Strip out the keys and URLs
    for (let i = 0; i < tracks.length; i++) {
      delete tracks[i].url
      delete tracks[i].key
    }

    // Prepare the payload
    const data = { 
      tracks: tracks 
    }

    // Away it goes
    res
    .status(200)
    .json(data)
  })
})

app.get('/tracks/:id([0-9]*)/stream', (req, res) => {

  // process.stdout.write('REQUEST RECEIVED: ')
  // console.log(chalk.blue(`${req.method} ${req.url}`))

  // Query the database for one track
  const id = req.params.id
  database.query(`SELECT * FROM tracks WHERE id = ${id}`, (error, results, fields) => {

    // Handle any errors
    if (error) {
      console.log(error)
      process.stdout.write('DB ERROR: ')
      console.log(chalk.red(error.code))
      return res.sendStatus(500)
    }

    const track = results[0]

    // Get a pre-signed temporary URL
    const URL = getSignedURL(track.key)

    // Prepare the payload
    const data = { 
      url: URL 
    }

    // Away it goes
    res
    .status(200)
    .json(data)
  })
});

function getSignedURL(key) {

  // Docs: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
  return client.getSignedUrl('getObject', {
    Key: key,
    Expires: 60 // URL expires in 1 minute
  })
}

module.exports = app