const express = require('express');
const uuid = require('uuid');
const bcrypt = require('bcryptjs'); //allows for encrypting specific data
const jwt = require('jsonwebtoken'); // allows us to generate a new token from a given information entered

require('dotenv').config();

const User = require('../models/user');
const Address = require('../models/address');

const uploader = require("../utils/multer");
// const { decryptObject, encryptObject } = require('../encrypt');+

const route = express.Router();

// admin endpoint to view all user
route.get('/all_user', async(req, res) => {
    const all = await User.find({__v:0}).sort({timestamp: -1}).lean()
    res.status(200).send({'status': 'Success', all})
})

// User profile endpoint
route.post('/user_profile', async (req,res) => {
    const {token} = req.body;

    if (!token) return res.status(400).send({'status':'Error', "msg":'Token Required for action'})

    try{
        const profile = jwt.verify(token, process.env.JWT_SECRET );
        if (!profile) return res.status(400).send({'status':'Error', "msg":'invalid token'})
        const user = await User.findOne({_id : profile._id});
        if (!user) return res.status(400).send({'status':'Error', "msg":'Error occured while fetching the user'})

        return res.status(200).send({'status':'Success', "msg":'success', user})

    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }
})

// endpoint to delete user
route.post('/delete_user', async(req,res)=>{
    const {token} = req.body;
    if (!token) {
        return res.status(400).send({'status': 'Error', 'msg': 'fill in required inputs'})
    }
    try {
        const user = jwt.verify(token, process.env.JWT_SECRET);

        if (!user) return res.status(400).send({'status': 'Error', 'msg': 'invalid token'}) 

        //delete User Object
    await User.deleteOne({_id : user._id})
   
    return res.status(200).send({'status': 'success', 'msg': 'user deleted successfully'})


    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }
    
})

// endpoint to update profile
route.post("/update_profile", async (req,res)=>{
    const {token, username, phone_no, email} = req.body;

    if (!token) return res.status(400).send({'status':'Error', 'msg':'token required'})

    try{
        const profile = jwt.verify(token, process.env.JWT_SECRET);
        // const user = await User.findOne({_id:profile._id})

        if (!profile) return res.status(400).send({'status': 'Error', 'msg': 'invalid token'})

        const user = await User.findByIdAndUpdate(
            {_id: profile._id},
            {
                $set:{
                    username:username,
                    email:email,
                    phone_no:phone_no,
                }
            }, {new:true}
        ).lean();
        
        return res.status(200).send({'status':'Success','msg': 'User profile has been updated', user})
    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    } 

})

// endpoint to change profile picture
route.post('/change_dp', uploader.single("image"), async(req,res) => {
    const {token} = req.body;

    if (!token) return res.status(400).send({'status':'Error', 'msg': 'token required'});

    try{
        const profile = jwt.verify(token, process.env.JWT_SECRET)
        if (!profile) return res.status(400).send({'status':'Error', 'msg': 'Invalid Token '});
        
        let img_url, img_id;
        // check if image was sent in and upload to cloudinary
        if(req.file) {
            // folder is used to specify the folder name you want the image to be saved in
            const {secure_url, public_id} = await cloudinary.uploader.upload(req.file.path, {folder: 'profile-images'});
            img_url = secure_url;
            img_id = public_id;
        }

        const user = await User.findByIdAndUpdate(profile._id, {
            img_url : img_url,
            img_id : img_id
        }, {new:true} ).lean;
        if (!user) return res.status(400).send({'status':'Error', 'msg': 'user does not exist'});

        return res.status(200).send({'status':'success', 'msg': 'Profile picture successfully updated', user})

    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    } 
})

// change password endpoint
route.post('/change_password', async (req,res)=>{
    const {token, old_password, new_password, confirm_password} = req.body;

    if (!token) return res.status(400).send({'status':'Error', 'msg': 'token required'});

    if (!old_password || !new_password || !confirm_password){
        return res.status(400).send({"status": "Error", "msg": "all fields must be filled"})
    }

    try{
        const profile = jwt.verify(token, process.env.JWT_SECRET);
        if (!profile) return res.status(400).send({'status':'Error', 'msg': 'invalid token'});
        const user = await User.findOne({_id: profile._id})
        if (!user) return res.status(400).send({'status':'Error', 'msg': 'Error fetching user'});

        if (new_password !== confirm_password) return res.status(400).send({'status':'Error', 'msg': "new password doesn't match confirm password"});

        // if old_password passed matches user password
        if ( await bcrypt.compare(old_password, user.password )) {
            await User.updateOne({_id:profile._id}, {password: await bcrypt.hash(new_password, 10)}, {new:true})
            
            return res.status(200).send ({"Status": "success", "msg": "password has been changed from " + old_password + " to " + new_password}, user)
        } else {     // if it doesn't match
            return res.status(400).send ({'status':'Error', 'msg': 'incorrect password '})
        }

        
    } catch (error) {
        console.error(error);
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }

     
})

// view pending order
route.post('/view_pending_order', async (req, res) => {
    const {token} = req.body;

    if (!token) return res.status(400).send({status: "Error", msg: "token required"})

    try {
        const profile = jwt.verify(token, process.env.JWT_SECRET)
        if (!profile) return res.status(400).send({status: "Error", msg: "invalid token"})
        
        const user = await User.findOne({_id:profile._id}).lean()

        if (!user.pending_order) {
            return res.status(200).send({status: "Success", msg: "No pending Order"})
        } else{
            return res.status(200).send({status: "Success", msg: "here's your Pending Order" + user.pending_order})
        }
        


    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    } 
    
})

// view delivered order
route.post('/view_pending_order', async (req, res) => {
    const {token} = req.body;

    if (!token) return res.status(400).send({status: "Error", msg: "token required"})

    try {
        const profile = jwt.verify(token, process.env.JWT_SECRET)
        if (!profile) return res.status(400).send({status: "Error", msg: "invalid token"})
        
        const user = await User.findOne({_id:profile._id}).lean()

        if (!user.delivered_order) {
            return res.status(200).send({status: "Success", msg: "No Delivered Order"})
        } else{
            return res.status(200).send({status: "Success", msg: "here's your Pending Order" + user.delivered_order})
        }
        


    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    } 
    
})

// view cancelled order
route.post('/view_pending_order', async (req, res) => {
    const {token} = req.body;

    if (!token) return res.status(400).send({status: "Error", msg: "token required"})

    try {
        const profile = jwt.verify(token, process.env.JWT_SECRET)
        if (!profile) return res.status(400).send({status: "Error", msg: "invalid token"})
        
        const user = await User.findOne({_id:profile._id}).lean()

        if (!user.cancelled_order) {
            return res.status(200).send({status: "Success", msg: "No cancelled Order"})
        } else{
            return res.status(200).send({status: "Success", msg: "here's your Cancelled Order" + user.cancelled_order})
        }
        


    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    } 
    
})

// view Saved Item
route.post('/view_pending_order', async (req, res) => {
    const {token} = req.body;

    if (!token) return res.status(400).send({status: "Error", msg: "token required"})

    try {
        const profile = jwt.verify(token, process.env.JWT_SECRET)
        if (!profile) return res.status(400).send({status: "Error", msg: "invalid token"})
        
        const user = await User.findOne({_id:profile._id}).lean()

        if (!user.saved_item) {
            return res.status(200).send({status: "Success", msg: "No Saved Item"})
        } else{
            return res.status(200).send({status: "Success", msg: "here's your Saved Items" + user.saved_item})
        }
        


    } catch (error) {
        console.error(error);
        if(error.name === 'JsonWebTokenError') {
            return res.status(400).send({status: 'error', msg: 'Token verification failed'});
        }
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    } 
    
})

//  new Address
route.post('/new_address', async (req, res) => {
    const {token, username, phone_no, address, city, state} = req.body; // Destructuring the request body

    if (!token) return res.status(400).send({status: "Error", msg: "token required"})
    // Checking if any required field is missing
    if (!username || !phone_no || !address || !city || !state) {
        return res.status(400).send({ "status": "error", "msg": "All field must be filled" });
    }

    try {
        
                    
        // create user document
        const address = new Address();
        address.username = username;
        address.phone_no = phone_no;
        address.address = address;
        address.city = city;
        address.state = state;
        
        // save my document on mongodb
        await address.save();

        return res.status(200).send({status: 'ok', msg: 'success', address});

    } catch (error) {
        console.error(error);
        // Sending error response if something goes wrong
        res.status(500).send({ "status": "some error occurred", "msg": error.message });
    }
});

/**
 * Endpoint to add card details
 * @param {object} card_details the object that stores the card details
 * format: {
      card_number: Number,
      holders_name: String,
      mm_yy: String,
      cvv: Number
    }
 */

// // endpoint to add card details   
// route.post("/add_card", async (req, res) => {
//     const { token, card_details } = req.body;

//     if (!token || !card_details) {
//         return res.status(400).send({ status: "error", msg: "required fields must be filled" });
//     }

//     try {
//         // token verification
//         const user = jwt.verify(token, process.env.JWT_SECRET);

//         // fetch initial user card details and decrypt it if any
//         const userM = await User.findById({ _id: user._id }, { card_details: 1 }).lean();
//         if (userM.card_details) {
//             // decrypt card details
//             let decrypted_card_details = decryptObject(userM.card_details, process.env.MYAPP_DIGITS);
//             decrypted_card_details.push(card_details);

//             // encrypt card details and update the user document
//             const encrypted_card_details = encryptObject(decrypted_card_details, process.env.MYAPP_DIGITS);
//             await User.updateOne({ _id: user._id }, { card_details: encrypted_card_details });

//             return res.status(200).send({ status: "ok", msg: "success", card_details: decrypted_card_details });
//         }

//         // encrypt card details and update the user document
//         const encrypted_card_details = encryptObject([card_details], process.env.MYAPP_DIGITS);

//         await User.updateOne({ _id: user._id }, { card_details: encrypted_card_details });

//         return res.status(200).send({ status: "ok", msg: "success", card_details: [card_details] });
//     } catch (e) {
//         console.error(e);
//         if (e.name === 'JsonWebTokenError')
//             return res.status(401).send({ status: "error", msg: "Token verification failed" });

//         return res.status(500).send({ status: "error", msg: "An error occured" });
//     }
// });
    
// // endpoint to view card details
// route.post("/view_card_details", async (req, res) => {
//     const { token } = req.body;

//     if (!token) {
//         return res.status(400).send({ status: "error", msg: "required fields must be filled" });
//     }

//     try {
//         // token verification
//         const user = jwt.verify(token, process.env.JWT_SECRET);

//         // fetch initial user card details
//         const { card_details } = await User.findById({ _id: user._id }, { card_details: 1 }).lean();

//         // check if user has card details
//         if (!card_details)
//             return res.status(200).send({ status: "ok", msg: "no card details for this user", count: 0 });

//         // decrypt card details
//         let decrypted_card_details = decryptObject(card_details, process.env.MYAPP_DIGITS);

//         return res.status(200).send({ status: "ok", msg: "success", card_details: decrypted_card_details, count: decrypted_card_details.length });

//     } catch (e) {
//         console.error(e);
//         if (e.name === 'JsonWebTokenError')
//             return res.status(401).send({ status: "error", msg: "Token verification failed" });

//         return res.status(500).send({ status: "error", msg: "An error occured" });
//     }
// });


module.exports = route;