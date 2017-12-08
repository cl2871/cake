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
const RedisStore = require('connect-redis')(session);

// ---- MongoDB Setup ----

require("./db");
const User = mongoose.model('User');
const Bakery = mongoose.model('Bakery');
const BakeryAuth = mongoose.model('BakeryAuth');
const Order = mongoose.model('Order');

// ---- Session Middleware Setup ----

const sessionOptions = {
	secret: 'secret',
	saveUninitialized: false, 
	resave: false 
};
const sessionMiddleware = session(sessionOptions);

// ---- App Session and Authentication Middlewares ----

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
app.use(user.middleware());
app.use(flash());

// ---- Socket.io Setup ----

const server = require('http').Server(app);
const io = require('socket.io')(server);
io.use(function(socket, next){
	sessionMiddleware(socket.request, socket.request.res, next);
});
app.io = io;

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

// ---- Bakery Authentication Middleware ----

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

// ---- User (Client) Authentication Middleware ----

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
	/* bakery dashboard, will establish a socket connection for bakery
	*/

	console.log('Session Id', req.session.id, 'Bakery Id', req.user.id);
	res.render('bakery_dashboard', {});
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
	/* will create a new order and save it in MongoDB and send a socket message to a bakery listening
		if no bakery is active, it will send a response back
	*/

	let bakeryId = "";
	let bakerySessionId = "";

	// check for active bakeries
	const active = Object.keys(fakeStore);
	if (active.length){

		bakerySessionId = active[0];
		bakeryId = fakeStore[bakerySessionId]['bakeryId'];

		//console.log("CHECKPOINT bakeryId", bakeryId, "bakerySessionId", bakerySessionId);

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
	}
	else{
		res.send('no active bakery');
	}
});

app.get('/bakery/list', (req, res) => {
	Bakery.find({}).populate('bakeryId').exec(function(err, bakeries){
		if (err){
			console.log(err);
		}
		res.render('bakeries', {bakeries: bakeries});
	});
});

// ---- Socket.io ----

io.on('connect', socket =>{

	const session = socket.request.session;

	// prevent app from crashing in case a user is stuck polling on dashboard
	if (!session.passport){
		socket.disconnect();
	}
	else{
		const user = session.passport.user;

		console.log('connected', socket.id, 'with session', session.id);

		// fill fakeStore with bakery info
		socket.on('start', function(data){
			fakeStore[session.id] = {};
			fakeStore[session.id]['bakeryId'] = user.id;
			fakeStore[session.id]['socketId'] = socket.id;
			fakeStore[session.id]['orders'] = [];

			io.to(socket.id).emit('deliver order', fakeStore[session.id]['orders']);
		});
	}

	socket.on('disconnect', function(){
		console.log('baker disconnected', socket.id, 'with session', socket.request.session.id);
		delete fakeStore[session.id];
	});
});

// listen
server.listen(port, function(){
	console.log('Listening on port ' + port);
});