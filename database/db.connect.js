const mongoose = require("mongoose")
require("dotenv").config()

const mongoUri = process.env.MONGODB

const intializeDatabase = async () => {
    await mongoose
    .connect(mongoUri)
    .then(() => {
        console.log("Connected to database.")
    })
    .catch((error) => {
        console.log("Error in connecting to database", error)
    })
}

module.exports = { intializeDatabase }