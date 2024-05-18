var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('fs-extra');
var resizeImg = require('resize-img');
var auth = require('../config/auth');
var isAdmin = auth.isAdmin;

//Get Product model
var Product = require('../models/product');

//Get Category model
var Category = require('../models/category');

//Get products index

router.get('/', isAdmin, (req, res) => {
    var count;

    Product.countDocuments(function(err, c){
       count = c;
    });

    Product.find(function(err, products){
        res.render('admin/products', {
            products: products,
            count: count
        });
    });
});

//Get add product

router.get('/add-product', isAdmin, (req, res) => {
    var title = "";
    var desc = "";
    var price = "";
 
    Category.find(function(err, categories){
        res.render('admin/add_product', {
            title: title,
            desc: desc,
            categories: categories,
            price: price
        });
    });

});

//Get edit page

router.get('/edit-product/:id', isAdmin, (req, res) => {

    var errors;
    if(req.session.errors) errors = req.session.errors;
    req.session.errors = null;
        
    Category.find(function(err, categories){

        Product.findById(req.params.id, function(err, p){
            if(err){
                console.log(err);
                res.redirect('/admin/products');
            } else {
                var galleryDir = 'public/product_gallery/' + p._id;
                var galleryImages = null;

                fs.readdir(galleryDir, function(err, files){
                    if(err) {
                        console.log(err);
                    }else{
                        galleryImages = files;

                        res.render('admin/edit_product', {
                            title: p.title,
                            errors: errors,
                            desc: p.desc, 
                            categories: categories,
                            category: p.category.replace(/\s+/g, '-').toLowerCase(),
                            price: parseFloat(p.price).toFixed(2),
                            image: p.image,
                            galleryImages: galleryImages,
                            id: p._id
                        });
                    }
                })
            }
            
        });
        
    });
    
});

//post add product

router.post('/add-product', (req, res) => {
    var imageFile="";
    if(req.files)
    imageFile = typeof req.files.image !== "undefined" ? req.files.image.name : "";
    

    req.checkBody('title', 'Title must have a value').notEmpty();
    req.checkBody('desc', 'Description must have a value').notEmpty();
    req.checkBody('price', 'Price must have a value').isDecimal();
    req.checkBody('image', 'You must upload an image').isImage(imageFile);

    var title = req.body.title;
    var slug = title.replace(/\s+/g, '-').toLowerCase();
    var desc = req.body.desc;
    var price = req.body.price;
    var category = req.body.category;

    var errors = req.validationErrors();

    if(errors) {
        Category.find(function(err, categories){
           res.render('admin/add_product', {
               errors: errors,
               title: title,
               desc: desc,
               categories: categories,
               price: price
           });
        });
    }else {
        Product.findOne({slug: slug}, function(err, product) {
          if(product) {
              req.flash('danger', 'Product title exists, choose another.');
              Category.find(function(err, categories){
                res.render('admin/add_product', {
                    title: title,
                    desc: desc,
                    categories: categories,
                    price: price
                });
             });
          }else{
              var price2 = parseFloat(price).toFixed(2);
              var product = new Product({
                  title: title,
                  slug: slug,
                  desc: desc,
                  price: price2,
                  category: category,
                  image: imageFile
              });
              product.save(function (err) {
                if (err)
                    return console.log(err);
                    
                mkdirp('public/product_gallery/'+product._id);
                mkdirp('public/product_thumbs/'+product._id);
               
                if (imageFile != "") {
                    
                    var productImage = req.files.image;
                    var path = 'public/product_images/'+product._id+'_'+req.files.image.name;

                    productImage.mv(path, function (err) {
                        if(err)
                        return console.log(err);
                    });
                }

                req.flash('success', 'Product added!');
                res.redirect('/admin/products');
            });
        }
    });
}

});


// post edit product
router.post('/edit-product/:id', (req, res) => {
    
    var imageFile="";
    if(req.files)
    imageFile = typeof req.files.image !== "undefined" ? req.files.image.name : "";
    

    req.checkBody('title', 'Title must have a value').notEmpty();
    req.checkBody('desc', 'Description must have a value').notEmpty();
    req.checkBody('price', 'Price must have a value').isDecimal();
    req.checkBody('image', 'You must upload an image').isImage(imageFile);

    var title = req.body.title;
    var slug = title.replace(/\s+/g, '-').toLowerCase();
    var desc = req.body.desc;
    var price = req.body.price;
    var category = req.body.category;
    var pimage = req.body.pimage;
    var id = req.params.id;

    var errors = req.validationErrors();

    if(errors) {
        req.session.errors = errors;
        res.redirect('/admin/products/edit-product/' + id);
    } else {
        
        Product.findOne({slug: slug, _id:{'$ne':id}}, function(err, p) {
            if(err) console.log(err);
            
            if(p) {
                req.flash('danger', 'Product title exists, choose another.');
                res.redirect('/admin/products/edit-product/'+id);
            } else {
                Product.findById(id, function(err, p){
                    if(err)
                    console.log(err);

                    p.title = title;
                    p.sulg = slug;
                    p.desc = desc;
                    p.price = parseFloat(price).toFixed(2);
                    p.category = category;
                    if(imageFile != "") {
                        p.image = imageFile;
                    }

                    p.save(function(err) {
                        if(err) 
                        console.log(err);

                        if(imageFile != ""){
                            if(pimage != "") {
                                fs.remove('public/product_images/'+pimage, function(err){
                                    if(err)
                                    console.log(err);
                                });
                            }

                            var productImage = req.files.image;
                            var path = 'public/product_images/'+p._id+'_'+req.files.image.name;

                            productImage.mv(path, function (err) {
                                if(err)
                                return console.log(err);
                            });
                        }

                        req.flash('success', 'Product edited!');
                        res.redirect('/admin/products/edit-product/'+id);
                    });
                });
            }
        });
    }

});

//Get delete page

router.post('/product-gallery/:id', (req, res) => {
    var productImage = req.files.file;
    var id = req.params.id;
    var path = 'public/product_gallery/' + id + "/" + req.files.file.name;
    var thumbPath = 'public/product_thumbs/' + id + "/" + req.files.file.name;

    productImage.mv(path, function(err){
        if(err)
        console.log(err);

        resizeImg(fs.readFileSync(path), {width: 100, height: 100}).then(function(buf){
            fs.writeFileSync(thumbPath, buf);
        })
    });

    res.sendStatus(200);

});

//Get delete product

router.get('/delete-product/:id', isAdmin, (req, res) => {
    var id = req.params.id;
    var path = 'public/product_images/' + id + '_' + req.query.image;
    var pathgallery = 'public/product_gallery/' + id;
    var paththumbs = 'public/product_thumbs/' + id;
    fs.remove(path, function(err){
        if(err){
            console.log(err);
        }else{
            fs.remove(pathgallery, function(err){
                if(err){
                    console.log(err);
                } else {
                    fs.remove(paththumbs, function(err){
                        if(err){
                            console.log(err);
                        } else {
                            Product.findByIdAndRemove(id, function(err){
                                if(err)
                                console.log(err);
                            });

                            req.flash('success', 'Product deleted!');
                            res.redirect('/admin/products');
                        }
                    });
                }
            });
        }
    });
});

//Get delete image
router.get('/delete-image/:image', isAdmin, (req, res) => {
    var originalImage = 'public/product_gallery/' + req.query.id + '/' + req.params.image;
    var thumbImage = 'public/product_thumbs/' + req.query.id + '/' + req.params.image;
    
    fs.remove(originalImage, function(err) {
        if(err){
            console.log(err);
        } else {
            fs.remove(thumbImage, function(err){
                if(err){
                    console.log(err);
                } else {
                    req.flash('success', 'Image deleted!')
                    res.redirect('/admin/products/edit-product/' + req.query.id);
                }
            });
        }
    });
});


//Exports
module.exports = router;