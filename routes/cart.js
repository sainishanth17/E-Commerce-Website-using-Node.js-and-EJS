var express = require('express');
var router = express.Router();

var checksum_lib = require('../Paytm_Web_Sample_Kit_NodeJs-master/checksum/checksum');

const port = 3000;
var orderId = 0;
var custId = 0;
//Get product model
var Product = require('../models/product');

//Get add product to cart

router.get('/add/:product', function(req, res) {
    var slug = req.params.product;
    Product.findOne({slug: slug}, function(err, p){
        if(err) console.log(err);

        if(typeof req.session.cart == "undefined") {
            req.session.cart = [];
            req.session.cart.push({
                title: slug,
                qty: 1,
                price: parseFloat(p.price).toFixed(2),
                image: '/product_images/'+p._id+'_'+p.image
            });
        } else {
            var cart = req.session.cart;
            var newItem = true;
            for(var i=0; i<cart.length; i++) {
                if(cart[i].title == slug) {
                    cart[i].qty++;
                    newItem = false;
                    break;
                }
            }

            if(newItem) {
                cart.push({
                    title: slug,
                    qty: 1,
                    price: parseFloat(p.price).toFixed(2),
                    image: '/product_images/'+p._id+'_'+p.image
                });
            }
        }

        req.flash('success', 'Product added!');
        res.redirect('back');
    });
 });

 //Get checkout page 
 router.get('/checkout', function(req, res){
     if(req.session.cart && req.session.cart == 0){
         delete req.session.cart;
         res.redirect('/cart/checkout');
     } else {
        res.render('checkout',{
            title: 'Checkout',
            cart: req.session.cart
        });
     }
    
 });

 //Get update product 
 router.get('/updates/:product', function(req, res){
     var slug = req.params.product;
    var cart = req.session.cart;
    var action = req.query.action;

    for(var i=0; i<cart.length; i++) {
        if(cart[i].title == slug) {
            switch(action){
                case "add":
                    cart[i].qty++;
                    break;
                case "remove":
                    cart[i].qty--;
                    if(cart[i].qty < 1) cart.splice(i, 1);
                    break;
                case "clear":
                    cart.splice(i, 1);
                    if(cart.length == 0) delete req.session.cart;
                    break;
                default:
                    console.log("update problem");
                    break;
            }
            break;
        }
    }

    req.flash('success', 'Cart updated!');
    res.redirect('/cart/checkout');
});

 //Get clear cart
 router.get('/clear', function(req, res){
    
    delete req.session.cart;
    req.flash('success', 'Cart cleared!');
    res.redirect('/cart/checkout');
   
});

router.get('/payment', function(req, res) {
    var cart = req.session.cart;
    var amount = req.query.amount;
    res.render('fill_details',{
        title: 'Fill address',
        cart: cart,
        amount: amount
    });
});

router.post('/payment', (req, res)=>{
    var amount = req.body.amount;
    orderId += 1;
    custId += 1;
    let params = {}
    params['MID'] = 'XIUwlT52492994977206',
    params['WEBSITE'] = 'WEBSTAGING',
    params['CHANNEL_ID'] = 'WEB',
    params['INDUSTRY_TYPE_ID'] = 'Retail',
    params['ORDER_ID'] = 'ORD0005',
    params['CUST_ID'] = 'CUST0011',
    params['TXN_AMOUNT'] = Number(amount),
    params['CALLBACK_URL'] = req.protocol + '://' + req.get('host') + '/paymentDone'
    params['MOBILE_NO'] = '8292647222'
    params['EMAIL'] = 'prabhubishwas3@gmail.com'

    checksum_lib.genchecksum(params, '&a_YK%d_unUOZwO7', function(err, checksum){
        if(err)
        console.log(err);

        let txn_url = "https://securegw-stage.paytm.in/order/process";

        let form_fields = "";
        for(x in params){
            form_fields += "<input type='hidden' name='"+x+"' value='"+params[x]+"'>";
        }

        form_fields += "<input type='hidden' name='CHECKSUMHASH' value='"+checksum+"'>";

        var html = '<html><body><center><h1>Please wait! Do not refresh the page</h1></center><form method="post" action="'+txn_url+'" name="f1">'+form_fields+'</form><script>document.f1.submit()</script></body></html>';
        res.writeHead(200, {'Content-Type' : 'text/html'});
        res.write(html);
        res.end();
    });
});

/*router.post('/callback', (req, res)=>{
    
});*/

//Exports
module.exports = router;