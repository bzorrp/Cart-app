const express = require('express');
require('dotenv').config()
const app = express();

// parse JSON data coming in the r eequest body
app.use(express.json());

// gain access to mu routes
app.use("/auth", require('./routes/auth'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI_LOCAL)
    .catch(error => console.log(`DB Connection error: ${error}`));
const con = mongoose.connection;
// handle error when opening db
con.on('open', error => {
    if (!error)
        console.log('DB Connection Successful');
    else
        console.log(`Error Connecting to DB: ${error}`);
});

// handle mongoose disconnect from mongodb
con.on('disconnected', error => {
    console.log(`Mongoose lost connection with MongoDB:
${error}`);
});