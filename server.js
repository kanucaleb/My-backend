const dotenv = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const userRoute = require('./routes/userRoute');
const productRoute = require('./routes/productRoute');
const contactRoute = require('./routes/contactRoute');
const errorHandler =require('./middleWare/errorMiddleware');
const cookieParser = require('cookie-parser');
const path = require ('path');




const app = express();

//Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors({
    origin: ['http://localhost:3000','http://localhost:3001','http://172.20.10.6:3001', 'https://pinvent-app.vercel.app'],
    credentials: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'upload')))

//Routes Middleware
app.use('/api/users', userRoute);
app.use('/api/products', productRoute);
app.use('/api/contactus', contactRoute);



//Routes
app.get('/', (req, res)=>{
    res.send('Home page');
});

const PORT = process.env.PORT || 5000;


//Error Middleware
app.use(errorHandler);

//connect to mongoDB and start server

mongoose
.connect(process.env.MONGO_URI)
.then(()=>{app.listen(PORT, ()=>{
    console.log('server Running on port ${PORT}')
})
})
.catch((err)=>console.log(err)); 