const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const User = require('../models/user');
const cloudinary = require
const route = express.Router();

//  endpoint for user to signup
route.post('/sign_up', async (req, res) => {
    const { password, username, email, phone_no, address } = req.body; // Destructuring the request body

    // Checking if any required field is missing
    if (!password || !username || !email || !phone_no) {
        return res.status(400).send({ "status": "error", "msg": "Fill in your details" });
    }

    try {
        // check if username has been used to create an account before
        const found = await User.findOne({ username }, { username: 1, _id: 0 }).lean();
        if (found)
            return res.status(400).send({ status: 'error', msg: `User with this username: ${username} already exists` });

        // create user document
        const user = new User();
        user.username = username;
        user.password = await bcrypt.hash(password, 10);
        user.phone_no = phone_no;
        user.email = email;
        user.address = address || "";
        user.img_url = "";
        user.img_id = "";
        user.posts = [];
        user.followers = [];
        user.timestamp = Date.now();

        // save my document on mongodb
        await user.save();

        return res.status(200).send({status: 'ok', msg: 'success', user});

    } catch (error) {
        console.error(error);
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }
});

// endpoint for user to login
route.post('/login', async (req, res) => {
    const { username, password } = req.body; // Destructuring the request body

    // Checking if any required field is missing
    if (!username || !password) {
        return res.status(400).send({ 'status': 'Error', 'msg': 'all fields must be filled' });
    }

    try {
        // check if user with that username exists in the database
        const user = await User.findOne({ username: username });

        // If user is not found, return error
        if (!user) {
            return res.status(400).send({ 'status': 'Error', 'msg': 'Incorrect username or password' });
        }

        // check if password is correct
        if(await bcrypt.compare(password, user.password)) {
            // generate jwt token
            const token = jwt.sign({
                _id: user._id,
                email: user.email,
                username: user.username
            }, process.env.JWT_SECRET);

            // example of a token that will expire after 10mins
            // const token = jwt.sign({
            //     _id: user._id,
            //     email: user.email,
            //     username: user.username
            // }, process.env.JWT_SECRET, {expiresIn: '10m'});

            // update user document online status
            user.is_online = true;
            await user.save();
            
        // Sending success response
        res.status(200).send({ 'status': 'Success', 'msg': 'You have successfully logged in', user, token });
        } else {
            // Sending success response
            res.status(400).send({ 'status': 'error', 'msg': 'incorrect username or password'});
        }

    } catch (error) {
        console.error(error);
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }
});

// forgot password endpoint
 route.post('/forgot', async (req, res) => {
    try {
        const {username, password} = req.body;

    // checking if the given details exist in our database on compass
    const usercheck = await User.findOne({ username }, { username: 1, _id: 0 }).lean();
    if (!usercheck) {
        return res.status(400).send({ 'status': 'Error', 'msg': 'You are not in the book of life' });
    }

    const newpass = await bcrypt.hash(password, 10);     // encypting the new password

    // out with the old, in with the new
    usercheck.password = newpass;
    res.status(200).send({ 'status': 'success', 'msg': 'password successfully reset' });    // amazing
 }  catch (error) {
    console.error(error);
    res.status(500).send({ "status": "some error occurred", "msg": error.message });     // Sending error response if something goes wrong
}
});

// endpoint to logout
route.post('/logout', async (req, res) => {
    try {
        res.status(200).send({ 'status': 'success', 'msg': 'good bye' });    
    } catch (error) {
        console.error(error);
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }

    // Checking if any required field is missing
    if (!token) {
        return res.status(400).send({ 'status': 'Error', 'msg': 'all fields must be filled' });
    }

    try {
        // token authentication
        const user = jwt.verify(token, process.env.JWT_SECRET);

        // update user document online status
        await User.updateOne({_id: user._id}, {is_online: false});

        res.status(200).send({ 'status': 'success', 'msg': 'success' });       
    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }
});

module.exports = route;
