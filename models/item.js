const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    product_name: String,
    color: String,
    brand: String,
    price: Number,
    description: String,
    discount_rate: Number,
    size: Number,
    text: String,
    balance: Number,
}, {collection: 'item'});

const model = mongoose.model('Item', userSchema);
module.exports = model;