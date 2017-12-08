// app for a fast cake delivery service

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport'), 
	LocalStrategy = require('passport-local').Strategy;
const ConnectRoles = require('connect-roles');
const user = new ConnectRoles();
const bcrypt = require('bcryptjs');
//const fs = require('fs');
const flash = require('connect-flash');
const server = require('http').Server(app);
const io = require('socket.io')(server);
app.io = io;
const RedisStore = require('connect-redis')(session);

// connect to db and utilize mongoose models
require("./db");
const User = mongoose.model('User');
const Bakery = mongoose.model('Bakery');
const BakeryAuth = mongoose.model('BakeryAuth');
const Order = mongoose.model('Order');

// ---- Session Middleware ----
const sessionOptions = {
	secret: 'secret',
	saveUninitialized: false, 
	resave: false 
};

const sessionMiddleware = session(sessionOptions);
io.use(function(socket, next){
	sessionMiddleware(socket.request, socket.request.res, next);
});
app.use(sessionMiddleware);


app.use(passport.initialize());
app.use(passport.session());
app.use(user.middleware());
app.use(flash());

// ---- Passport ----
passport.serializeUser(function(user, done){
	const diff = {
		id: user.id,
		type: user.role
	};
	done(null, diff);
});

passport.deserializeUser(function(diff, done){
	let ModelType = null;
	if(diff.type === 'baker'){
		ModelType = BakeryAuth;
	}
	else{
		ModelType = User;
	}
	ModelType.findById(diff.id, function(err, user){
		done(err, user);
	});
});

// ---- Bakery Middleware (Check Permission) ----
function bakeryAuthenticated(req, res, next){
	/* checks to make sure a user is authenticated
	*/

	if (req.isAuthenticated() && req.user.role === 'baker'){
		return next();
	}
	else{
		res.redirect('/bakery/login');
	}
}

// ---- User Middleware (Check Permission) ----
function clientAuthenticated(req, res, next){
	/* checks to make sure a user is authenticated
	*/

	if (req.isAuthenticated() && req.user.role === 'client'){
		return next();
	}
	else{
		res.redirect('/user/login');
	}
}

// ---- Bakery Login ----
passport.use('bakery-login', new LocalStrategy(
	function(username, password, done){
		BakeryAuth.findOne({username: username}, function(err, user){
			if(err){
				console.log(err);
				return done(err);
			}
			if(!user){
				console.log("Incorrect user");
				return done(null, false);
			}
			if(!(bcrypt.compareSync(password, user.password))){
				console.log("Incorrect password");
				return done(null, false);
			}
			return done(null, user);
		});
	})
);

// ---- User Login ----
passport.use('user-login', new LocalStrategy({
		usernameField: 'email',
		passReqToCallback: true
	},
	function(req, email, password, done){
		User.findOne({email: email}, function(err, user){
			if(err){
				console.log(err);
				return done(err);
			}
			if(!user){
				console.log("Incorrect user");
				return done(null, false);
			}
			if(!(bcrypt.compareSync(password, user.password))){
				console.log("Incorrect password");
				return done(null, false);
			}
			return done(null, user);
		});
	})
);

// ---- Bakery Registration ----
passport.use('bakery-register', new LocalStrategy({
		passReqToCallback: true
	},
	function(req, username, password, done){
		process.nextTick(function(){
			BakeryAuth.findOne({username: username}, function(err, user){
				if(err){
					console.log(err);
				}
				if(user){
					console.log("Username is taken");
				}
				else{
					const newBakeryAuth = new BakeryAuth();
					newBakeryAuth.username = username;
					newBakeryAuth.password = bcrypt.hashSync(password, 10);

					// save data into database
					newBakeryAuth.save(function(err, bakeryAuth){
						if(err){
							console.log(err);
						}
						else{
							const newBakery = new Bakery();
							newBakery.bakeryId = newBakeryAuth._id;
							newBakery.name = req.body.name;
							newBakery.address = req.body.address;
							newBakery.city = req.body.city;
							newBakery.zipcode = req.body.zipcode;
							newBakery.country = req.body.country;
							newBakery.state = req.body.state;
							newBakery.phone = req.body.phone;

							// save data into database
							newBakery.save(function(err, bakery) {
								if (err){
									console.log(err);
								}
								else{
									console.log("Created new bakery user " + bakeryAuth.username + " for bakery " + bakery.name);
									return done(null, newBakeryAuth);
								}
							});
						}
					});
				}
			});
		});
	}
)); 

// ---- User Registration ----
passport.use('user-register', new LocalStrategy({
		usernameField: 'email',
		passReqToCallback: true
	},
	function(req, email, password, done){
		process.nextTick(function(){
			User.findOne({email: email}, function(err, user){
				if(err){
					console.log(err);
				}
				if(user){
					console.log("Username is taken");
				}
				else{
					const newUser = new User();
					newUser.email = email;
					newUser.password = bcrypt.hashSync(password, 10);
					newUser.phone = req.body.phone;

					newUser.save(function(err, user){
						if(err){
							console.log("Error " + err);
						}
						console.log("Created new user " + user.email);
						return done(null, newUser);
					});
				}
			});
		});
	}
)); 

// ---- Variables ----

// port 8081 is default for Elastic Beanstalk
const port = process.env.port || 8081;
const PLACES_KEY = process.env.PLACES_KEY;
const YELP_KEY = process.env.YELP_KEY;
const fakeStore = {};

// ---- Setup ----

// serve static files from public
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

// serve views files from views
app.set('views', path.join(__dirname, 'views'));

//extended: false treats everything as a string
app.use(bodyParser.urlencoded({ extended: false }));

// set view engine as handlebars
app.set('view engine', 'hbs');

// ---- Routes ----

app.get('/', (req, res) => {
	res.render('cake', {});
});

app.post('/', (req, res) => {
	res.redirect('/getCake');
});

// ---- Login for Bakeries ----

app.get('/bakery/login', (req, res) => {
	res.render('bakery_login');
});

app.post('/bakery/login', passport.authenticate('bakery-login', {
	successRedirect: '/bakery/dashboard',
	failureRedirect: '/bakery/login',
	failureFlash:true
}));

// ---- Register for Bakeries ----

app.get('/bakery/register', (req, res) => {
	res.render('bakery_register', {PLACES_KEY, YELP_KEY});
});

app.post('/bakery/register', passport.authenticate('bakery-register', {
  successRedirect: '/bakery/dashboard',
  failureRedirect: '/bakery/register',
  failureFlash: true
}));

// ---- Login for Users ----

app.get('/user/login', (req, res) => {
	res.render('user_login');
});

app.post('/user/login', passport.authenticate('user-login', {
	successRedirect: '/user/dashboard', //TODO: this should be the user's online tracker
	failureRedirect: '/user/login',
	failureFlash:true
}));

// ---- Registration for Users ----

app.get('/user/register', (req, res) => {
	res.render('user_registration');
});

app.post('/user/register', passport.authenticate('user-register', {
	successRedirect: '/', //TODO: this should be the user's online tracker
	failureRedirect: '/user/register',
	failureFlash: true
}));

// ---- Dashboard Routes ----

app.get('/bakery/dashboard', bakeryAuthenticated, (req, res) => {
	// add bakery user session id to data store as key with an object
	console.log('Session Id', req.session.id, 'Bakery Id', req.user.id);
	res.render('bakery_dashboard', {userId: req.user.id});
});

app.get('/user/dashboard', clientAuthenticated, (req, res) => {
	res.render('user_dashboard');
});

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

app.get('/getCake', clientAuthenticated, (req, res) => {
	res.render('order_form', {PLACES_KEY, YELP_KEY});
});

app.post('/order/new', (req, res) =>{

	let bakeryId = "";
	let bakerySessionId = "";

	// check for active bakeries
	if (fakeStore){
		const active = Object.keys(fakeStore);
		bakerySessionId = active[0];
		bakeryId = fakeStore[bakerySessionId]['bakeryId'];
	}
	else{
		res.send('no active bakery');
	}

	console.log("CHECKPOINT bakeryId", bakeryId);

	// make new order based on Order model
	const newOrder = new Order({
		address: req.body.address,
		bakery: bakeryId,
		user: req.user.id
	});

	// save order and then redirect
	newOrder.save(function(err, order) {
		if(err){
			console.log(err);
		}
		else{
			console.log('added order', order.id);
		}
		fakeStore[bakerySessionId]['orders'].push(order);
		app.io.to(fakeStore[bakerySessionId]['socketId']).emit('deliver order', fakeStore[bakerySessionId]['orders']);
		res.send('success');
	});
});

// app.get('/bakeries/new', (req, res) => {
// 	res.render('onboarding_form', {PLACES_KEY, YELP_KEY});
// });

// app.post('/bakeries', (req, res) => {
// 	//console.log(req.body);
// 	const deliver = (req.body.deliver === 'true');

// 	const newBakery = new Bakery({
// 		name: req.body.name,
// 		address: req.body.address,
// 		email: req.body.email,
// 		password: req.body.password,
// 		phone: req.body.phone,
// 		deliver: deliver
// 	});

// 	newBakery.save(function(err, bakery) {
// 		if (err){
// 			console.log(err);
// 		}
// 		console.log('added bakery', bakery.name);
// 		res.redirect('/bakeries');
// 	});
// });

app.get('/bakery/list', (req, res) => {
	Bakery.find({}).populate('bakeryId').exec(function(err, bakeries){
		if (err){
			console.log(err);
		}
		res.render('bakeries', {bakeries: bakeries});
	});
});

io.on('connect', socket =>{

	const sessionId = socket.request.session.id;

	console.log('connected', socket.id, 'with session', sessionId);

	socket.on('start', function(data){
		fakeStore[sessionId] = {};
		fakeStore[sessionId]['bakeryId'] = data.userId;
		fakeStore[sessionId]['socketId'] = socket.id;
		fakeStore[sessionId]['orders'] = [];

		io.to(socket.id).emit('deliver order', fakeStore[sessionId]['orders']);
	});


	socket.on('disconnect', function(){
		console.log('baker disconnected', socket.id, 'with session', socket.request.session.id);
		delete fakeStore[sessionId];
	});

});

// listen
server.listen(port, function(){
	console.log('Listening on port ' + port);
});