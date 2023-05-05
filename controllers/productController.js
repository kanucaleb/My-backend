const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');
const { fileSizeFormatter } = require('../utils/fileUpload');
const cloudinary = require('cloudinary').v2;


const createProduct = asyncHandler(async(req, res)=>{
    const{name, sku, category,quantity, price, description} = req.body;

    //Validation
    if(!name || !category || !quantity || !price || !description){
        res.status(404)
        throw new Error('please fill in all fields')
    }
    //Handle file upload
    let fileData = {}
    //Save image to cloudinary
    let uploadedFile;
    try {
        uploadedFile = await cloudinary.uploader.upload(req.file.
        path, {
            folder: 'Pinvent App',
            resource_type: 'image',
        });
    } catch (error) {
        res.status(500)
        throw new Error('image could not be uploaded')
    }

    if(req.file){
        fileData ={
            fileName: req.file.originalname,
            filePath: uploadedFile.secure_url,
            fileType: req.file.mimetype,
            fileSize: fileSizeFormatter( req.file.size, 2),

        }
    }

    //Create product
    const product = await Product.create({
        user: req.user.id,
        name,
        sku,
        category,
        quantity,
        price,
        description,
        image: fileData,
    });

    res.status(201).json(product);
});

//Get all products
const getProducts = asyncHandler(async(req, res)=>{
   const products = await Product.find({user: req.user.id}).sort('-createdAt');
    res.status(200).json(products)
})

//Get a single product
const getProduct = asyncHandler(async(req, res)=>{
    const product = await Product.findById(req.params.id)
    //If product does not exist
    if(!product){
        res.status(404)
        throw new Error('Product not found')
    }
    //Match product to its user
    if(product.user.toString() !== req.user.id){
        res.status(401)
        throw new Error('user not authorized')
    }
    res.status(200).json(product);

})

const deleteProduct = asyncHandler(async(req, res)=>{
    const product = await Product.findById(req.params.id)
    if(!product){
        res.status(404)
        throw new Error('Product not found')
    }
    //Match the product to its user
    if(product.user.toString() !== req.user.id){
        res.status(401)
        throw new Error('user not authorized')
    }
    await product.remove();
    res.status(200).json({message: 'product successfully deleted'});

})
const updateProduct = asyncHandler(async(req, res)=>{
    const{name, category, quantity, price, description} = req.body;

    const{id}=req.params

    const product = await Product.findById(req.params.id)
    
    //if product dosen't exist
    if(!product){
        res.status(404)
        throw new Error('product not found')
    }
     //Match the product to its user
     if(product.user.toString() !== req.user.id){
        res.status(401)
        throw new Error('user not authorized')
    }

    //Handle file upload
    let fileData = {} 
    if(req.file){
        fileData ={
            fileName: req.file.originalname,
            filePath: uploadedFile.secure_url,
            fileType: req.file.mimetype,
            fileSize: fileSizeFormatter( req.file.size, 2),

        }
    }

    //update product

const updatedProduct = await Product.findByIdAndUpdate(
    {_id: id},
     {
        name,
        category,
        quantity,
        price,
        description,
        image: Object.keys(fileData).length === 0 ? product?.image : fileData,
    },
    {
        new: true,
        runValidators: true,
    },
    )

    res.status(200).json(updatedProduct);
});





module.exports = {
    createProduct,
    getProducts,
    getProduct,
    deleteProduct,
    updateProduct,
}