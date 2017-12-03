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
	LocalStrategy = require('passport-local').Strategy
const ConnectRoles = require('connect-roles');
const user = new ConnectRoles();
const bcrypt = require('bcryptjs');
//const fs = require('fs');

// connect to db and utilize mongoose models
require("./db");
const User = mongoose.model('User');
const Bakery = mongoose.model('Bakery');
const Bakery_Auth = mongoose.model('Bakery_Auth');
const Order = mongoose.model('Order');

// ---- Session Options ----
const sessionOptions = {
	secret: 'secret',
	saveUninitialized: false, 
	resave: false 
};

app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());
app.use(user.middleware());

// ---- Passport ----
passport.serializeUser(function(user, done){
	const diff = {
		id: user.id,
		type: user.role
	}
	done(null, diff);
});

passport.deserializeUser(function(diff, done){
	let ModelType = null;
	if(diff.type == 'baker'){
		ModelType = Bakery_Auth;
	}
	else{
		ModelType = User;
	}
	ModelType.findById(diff.id, function(err, user){
	 	done(err, user);
	});
});

// ---- Bakery Middleware (Check Permission) ----
user.use('bakery permission',function(req){
	console.log("Bakery needs/has permission");
	console.log(req.user.role);
	if(req.user.role == 'baker'){
		console.log("Person is baker");
		return true;
	}
});

// ---- User Middleware (Check Permission) ----
user.use('user permission', function(req){
	console.log("User needs/has permission");
	console.log(req.user.role);
	if(req.user.role == 'client'){
		console.log("Person is user");
		return true;
	}
});

// ---- Bakery Login ----
passport.use('bakery-login', new LocalStrategy(
	function(username, password, done){
		Bakery_Auth.findOne({username: username}, function(err, user){
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
		usernameField: 'email'
	},
	function(username, password, done){
		User.findOne({username: username}, function(err, user){
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
			Bakery_Auth.findOne({username: username}, function(err, user){
				if(err){
					console.log(err);
				}
				if(user){
					console.log("Username is taken");
				}
				else{

					const newBakeryAuth = new Bakery_Auth();
					newBakeryAuth.username = username;
					newBakeryAuth.password = bcrypt.hashSync(conf.pass, 10);

					// save data into database
					newBakeryAuth.save(function(err, bakery){
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
									console.log("Created new bakery user");
									return done(null, Bakery_Auth);
								}
							});
						}
					});
				}
			});
		})
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
					newUser.username = email;
					newUser.password = bcrypt.hashSync(password, 10);
					newUser.phone = req.body.phone;

					newUser.save(function(err, usr){
						if(err){
							console.log("Error");
						}
						console.log("Created new user");
						return done(null, newUser);
					});

				}
			});
		})
	}
)); 

// ---- Variables ----

// port 8081 is default for Elastic Beanstalk
const port = process.env.port || 8081;
const PLACES_KEY = process.env.PLACES_KEY;
const YELP_KEY = process.env.YELP_KEY;

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

app.get('/getCake', (req, res) => {
	res.render('order_form', {PLACES_KEY, YELP_KEY});
});

app.get('/bakeries/new', (req, res) => {
	res.render('onboarding_form', {PLACES_KEY, YELP_KEY});
});

app.post('/bakeries', (req, res) => {
	//console.log(req.body);
	const deliver = (req.body.deliver === 'true');

	const newBakery = new Bakery({
		name: req.body.name,
		address: req.body.address,
		email: req.body.email,
		password: req.body.password,
		phone: req.body.phone,
		deliver: deliver
	});

	newBakery.save(function(err, bakery) {
		if (err){
			console.log(err);
		}
		console.log('added bakery', bakery.name);
		res.redirect('/bakeries');
	});
});

app.get('/bakeries', (req, res) => {
	Bakery.find({}, function(err, bakeries){
		if (err){
			console.log(err);
		}
		res.render('bakeries', {bakeries: bakeries});
	});
});

app.get('/findBakery', (req, res) => {
	/* finds the closest bakery and sends back a json
	*/

	const postal = {
		'zipcode': req.query.postal
	};


	Bakery.find(postal, function(err, bakeries){
		if (err){
			console.log(err);
		}
		//console.log(bakeries);
		if (bakeries[0]){
			res.json(bakeries[0]);
		}
		else{
			const error = {error: 'No Bakeries'};
			res.json(error);
		}
	});
});

// listen
app.listen(port, function(){
	console.log('Listening on port ' + port);
});