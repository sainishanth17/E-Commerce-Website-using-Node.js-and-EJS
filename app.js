
var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var config = require('./config/database');
var bodyParser = require('body-parser');
var session = require('express-session');
var mkdirp = require('mkdirp');
var expressValidator = require('express-validator');
var fileUpload = require('express-fileupload');
var passport = require('passport');


//connect to db
mongoose.connect(config.database, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.once('open', () => {
    console.log("MongoDB connected");
});

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Set the public folder
app.use(express.static(path.join(__dirname, 'public')));

//set the global errors variable
app.locals.errors = null;

//Get page model
var Page = require('./models/page');

//Get all pages to pass to header.ejs
Page.find({}).sort({sorting: 1}).exec(function(err, pages) {
  if(err){
    console.log(err);
  } else {
    app.locals.pages = pages;
  }
});

var Category = require('./models/category');

//Get all Categories to pass to header.ejs
Category.find(function(err, categories) {
  if(err){
    console.log(err);
  } else {
    app.locals.categories = categories;
  }
});

//Express fileUpload middleware
app.use(fileUpload());

//Body parser middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


//Express session middleware
app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    //cookie: { secure: true }
  }));

//Express validator middleware
app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root;
  
      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      };
    },
    customValidators: {
      isImage: function(value, filename) {
        var extension = (path.extname(filename)).toLowerCase();
        switch(extension) {
          case '.jpg':
            return '.jpg';
          case '.jpeg':
            return '.jpeg';
          case '.png':
            return '.png';
          case '':
            return '.jpg';
          default:
            return false;
        }
      }
    }
  }));

  //Express nessages middleware
  app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});
//Passport config
require('./config/passport')(passport);
//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.cart = req.session.cart;
  res.locals.user = req.user || null;
  next();
});

//set routes
var pages = require('./routes/pages.js');
var products = require('./routes/products.js');
var cart = require('./routes/cart.js');
var users = require('./routes/users.js');
var adminPages = require('./routes/admin_pages.js');
var adminCategories = require('./routes/admin_categories.js');
var adminProducts = require('./routes/admin_products.js');

app.use('/products', products);
app.use('/cart', cart);
app.use('/users', users);
app.use('/', pages);
app.use('/admin/pages', adminPages);
app.use('/admin/categories', adminCategories);
app.use('/admin/products', adminProducts);


//start the server
var port = 3000;
app.listen(port, () => {
    console.log("Server started on port "+port);
});