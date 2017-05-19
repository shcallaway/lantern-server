const mysql = require('mysql')
const dotenv = require('dotenv')

// Set up environment vars
dotenv.config()

// Initialize database connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DATABASE
})
    
module.exports = connection