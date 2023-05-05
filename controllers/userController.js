const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const Token = require('../models/tokenModel');


const generateToken = (id) => {
  return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '1d'});
};
 
//Register User
const registerUser = asyncHandler( async (req, res)=>{
    // if(!req.body.email){
    //     res.status(400);
    //     throw new Error('please add an email');
    // }
    // res.send('Register User');
    const {name, email, password} = req.body

    //validation
    if (!name || !email || !password){
        res.status(400)
        throw new Error ('please fill in all required fields')
    }
    if (password.length < 6){
        res.status(400)
        throw new Error ('password should not be less than 6 characters')
    }
//Check if user email already exists
const userExists = await User.findOne({email});

if(userExists){
    res.status(400)
    throw new Error ('Email has already been registered by another user');
}

//Create new user
const user = await User.create({
    name,
    email,   
    password,
});

// Generate token
const token = generateToken(user._id)

//send Http-only cookies
res.cookie('token', token, {
path: '/', 
httpOnly: true, 
expires: new Date(Date.now() + 1000 * 86400), // 1 day
sameSite: 'none',
secure: true,
});

if (user){
    const {_id, name, email, photo, phone, bio } = user
    res.status(201).json({
        _id,
         name, 
         email, 
         photo, 
         phone, 
         bio, 
         token,
    })
}else{
    res.status(400)
    throw new Error ('invalid user data');
}

});

 //Login Users
const loginUser = asyncHandler(async (req, res) =>{
   
    const {email, password} = req.body

    //Validate request
    if(!email||!password){
        res.status(400);
        throw new Error('Please add email and password');

    }
    //Check if user exist
    const user = await User.findOne({email})

    if(!user){
        res.status(400);
        throw new Error('User not found please sign up');
    }

    //User exists, check if password is correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password);

    // Generate token
    const token = generateToken(user._id)

1   //send Http-only cookies
    res.cookie('token', token, {
    path: '/', 
    httpOnly: true, 
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: 'none',
    secure: true,
    });

    //not included
//  const user = asyncHandler(async(req, res)=>{});
    
    if(user && passwordIsCorrect){
        const{_id, name, email, photo, phone, bio } = user
        res.status(200).json({
            _id,
            name,
            email, 
            photo, 
            phone, 
            bio, 
            token,
    });
    }else{
        res.status(400);
        throw new Error('invalid email or password');
    }

});

//Logout User
const logout = asyncHandler(async(req, res)=>{
    res.cookie('token', '', {
        path: '/', 
        httpOnly: true, 
        expires: new Date(0),
        sameSite: 'none',
        secure: true,
        });
        return res.status(200).json({message: 'successfully logged out'});
});

//Get user Data
const getUser = asyncHandler(async (req, res)=>{
    const user = await User.findById(req.user._id)

    if (user){
        const{_id, name, email, photo, phone, bio } = user
        res.status(200).json({
            _id,
             name, 
             email, 
             photo, 
             phone, 
             bio, 
        })
    }else{
        res.status(400)
        throw new Error ('User not found');
    }
});

// Get Login Status
const loginStatus = asyncHandler (async (req, res)=>{
    const token =req.cookies.token;
    if(!token){
        return res.json(false)
    }

    // verify Token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
   if (verified){
    return res.json(true);
   }
});

//Update User

const updateUser = asyncHandler(async(req, res)=>{
 const user = await User.findById(req.user._id)

 if(user){
    const{name, email, photo, phone, bio } = user
        user.email = email;
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;  
        user.photo = req.body.photo || photo; 
        user.bio = req.body.bio || bio;  
    
        const updatedUser = await user.save()
        res.status(200).json({
            _id : updatedUser._id,
             name : updatedUser.name, 
             email : updatedUser.email, 
             photo : updatedUser.photo, 
             phone : updatedUser.phone, 
             bio : updatedUser.bio, 
        })
 }else{
    res.status(404)
    throw new Error ('user not found');
 }
});

const changePassword = asyncHandler(async(req, res)=>{
    const user = await User.findById(req.user._id)
    const {oldPassword, password} = req.body;

    if(!user){
        res.status(400)
        throw new Error('user not found, please signup');
    }
    //validate
    if(!oldPassword || !password){
        res.status(400)
        throw new Error('Please add old and new password');
    }

    //check if old password matches new password in the DB
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password)

    //Save new password
    if(user && passwordIsCorrect){
        user.password = password
        await user.save()
        res.status(200).send('password change successful')
    }else{
        res.status(400)
        throw new Error('old password is incorrect');
    }
})

const forgotPassword = asyncHandler(async(req, res)=>{
    const {email}=req.body
    const user = await User.findOne({email})

    if(!user){
        res.status(404)
        throw new Error('User does not exist')
    }
    //Delete Token if it exist in Database

    let token = await Token.findOne({userId: user._id})
    if(token){
        await token.deleteOne()
    }

    //Create reset Token
    let resetToken = crypto.randomBytes(32).toString('hex') + user._id

    console.log(resetToken);

    //Hash token before saving to DBconst 
    const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest('hex');
    // console.log(hashedToken);
    // console.log(resetToken);

    //Save token to DB
    await new Token({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60 * 1000) //Thirty minutes
    }).save()

    //Construct reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/
    resetpassword/${resetToken}`

    //Reset Email
    const message = `
    <h2>Hello ${user.name}</h2>
    <p>please use the URL below to reset your password</p>
    <p>Reset link is valid for 30 minutes</p>
    <a href= ${resetUrl} clicktracking=off> ${resetUrl} </a>  
    
    <p>Regards...</p>
    <p>caleb team</p>
    ` ;

    const subject = 'password Reset Request'
    const send_to = user.email
    const sent_from =process.env.EMAIL_USER

    try {
       await sendEmail(subject, message, send_to, sent_from) 
       res.status(200).json({success: true, message: 'Reset Email sent.'})
    } catch (error) {
       res.status(500)
       throw new Error('Email not sent please try again') 
    }

})

//Reset Password

const resetPassword = asyncHandler(async(req, res)=>{
    const {password} = req.body
    const {resetToken}= req.params

    //Hash token, then compare to token in DB  
    const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest('hex');

    //FIND TOKEN IN DB
    const userToken = await Token.findOne({
        token: hashedToken,
        //check if the token has expired i.e if it is greater than the current time
        expiresAt: {$gt: Date.now()}

    })
    if(!userToken){
        res.status(404)
        throw new Error('invalid or expired token')
    }

    //Find user

const user = await User.findOne({_id: userToken.userId})
user.password = password
await user.save()
res.status(200).json({
    message: 'password reset successful, please login',
})

})

module.exports= {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword,
} ; 