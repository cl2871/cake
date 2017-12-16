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
const flash = require('connect-flash');

// ---- MongoDB Setup ----

require("./db");
const User = mongoose.model('User');
const Bakery = mongoose.model('Bakery');
const BakeryAuth = mongoose.model('BakeryAuth');
const Order = mongoose.model('Order');

// ---- Config ----

// attempt to read in config file
const fs = require('fs');
const fn = path.join(__dirname, 'config.json');
let conf = "";

// if the config file exists, read it in
if (fs.existsSync(fn)) {
	const data = fs.readFileSync(fn);
	conf = JSON.parse(data);
}

// ---- Variables ----

// make redis_endpoint 'localhost' for local testing
const redis_endpoint = process.env.REDIS_ENDPOINT || conf.redis_endpoint;
// port 8081 is default for Elastic Beanstalk
const port = process.env.port || 8081;

const secret = conf.secret || process.env.SECRET;
const PLACES_KEY = conf.places_key || process.env.PLACES_KEY;
const YELP_KEY = conf.yelp_key || process.env.YELP_KEY;

// ---- Redis Setup ----

const redis = require('redis');
const socketRedis = require('socket.io-redis');
// use redis as session store
const sessionStore = require('connect-redis')(session);
const client = redis.createClient(6379, redis_endpoint);
const ttl = 1000; // time to live in seconds for a key
const store = redis.createClient(6379, redis_endpoint);
// publish and subscribe channels for each node instance
const sub = redis.createClient(6379, redis_endpoint);
const pub = redis.createClient(6379, redis_endpoint);

// ---- Session Middleware Setup ----

const sessionOptions = {
	secret: secret,
	store: new sessionStore({host: redis_endpoint, port: 6379, client: client, ttl: ttl}),
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
// utilize session middleware in io
io.use(function(socket, next){
	sessionMiddleware(socket.request, socket.request.res, next);
});
// adapter allows multiple socket.io nodes to broadcast + emit to each other
io.adapter(socketRedis({ host: redis_endpoint, port: 6379 }));

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

// ---- Misc App Setup ----

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
	successRedirect: '/user/dashboard', //TODO: this should be the user's online tracker
	failureRedirect: '/user/register',
	failureFlash: true
}));

// ---- Dashboard Routes ----

app.get('/bakery/dashboard', bakeryAuthenticated, (req, res) => {
	/* bakery dashboard, will establish a socket connection for bakery
	*/

	console.log('Session Id', req.session.id, 'Bakery Id', req.user.id);
	res.render('bakery_dashboard', {user: req.user});
});

app.get('/user/dashboard', clientAuthenticated, (req, res) => {
	res.render('user_dashboard', {user: req.user});
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

	// check for active bakeries
	const promise = new Promise((fulfill, reject) =>{

		// get list of all active bakeries
		store.hkeys('activeBakeries', function(err, bakeries){
			if (err){
				reject(err);
			}
			else{
				fulfill(bakeries);
			}
		});
	});
	promise.then(function(bakeries){

		console.log('BAKERIES:', bakeries);
		bakeryId = bakeries[0].split('_')[1];

		// make new order based on Order model
		const newOrder = new Order({
			address: req.body.address,
			bakery: bakeryId,
			user: req.user.id
		});

		// save order and send response
		newOrder.save(function(err, order) {
			if(err){
				res.send(err);
			}
			else{
				console.log('added order', order.id);

				// add orders to a bakery's list
				store.lpush('bakery_' + bakeryId, order.id);
				// add orders to a client's list
				store.lpush('client_' + req.user.id, order.id);
				// add information to order information
				store.hmset('order_' + order.id, 'address', order.address, 'userId', req.user.id, 'email', req.user.email);

				const message = {
					orderId: order.id,
					bakeryId: bakeryId,
					userId: req.user.id
				};

				// publish message in orders channel
				pub.publish('new order', JSON.stringify(message));

				res.send('success');
			}
		});
	}, function(err){
		res.send('no active bakery');
		console.log(err);
	});
	
});

app.get('/bakery/list', (req, res) => {
	/* lists out all the bakeries
	*/

	Bakery.find({}).populate('bakeryId').exec(function(err, bakeries){
		if (err){
			console.log(err);
		}
		res.render('bakeries', {bakeries: bakeries});
	});
});

app.get('/redis/reset', (req, res) => {
	store.flushall();
	res.send('reset redis cache');
});

// ---- Redis ----

sub.subscribe('new order');
sub.subscribe('update order');

sub.on('message', function(channel, message){
	/* on message event, parse the message, collect relevant information, and then send a message to corresponding socket
		note: promise-heavy to handle async access to redis
	*/

	console.log("Channel: " + channel);
	const msg = JSON.parse(message);

	if (channel === 'new order'){
		// get bakery socket id to send to
		const promise1 = new Promise((fulfill, reject) =>{
			store.hget('activeBakeries', 'bakery_' + msg.bakeryId, function(err, socketId){
				if (err){
					reject(err);
				}
				else{
					console.log('SOCKET ID', socketId);
					fulfill(socketId);
				}
			});
		}).catch((err) =>{
			console.log(err);
		});
		
		// get order information
		const promise2 = new Promise((fulfill, reject) =>{
			store.hgetall('order_' + msg.orderId, function(err, order){
				if (err){
					reject(err);
				}
				else{
					fulfill(order);
				}
			});
		});

		// deliver the order to listening bakery
		Promise.all([promise1, promise2]).then((data) =>{

			//console.log(data);
			const socketId = data[0];
			const order = data[1];

			console.log('SOCKET ID', socketId, 'ORDER', order);
			console.log('USER ID', msg.userId);

			order.id = msg.orderId;

			// deliver order to bakery
			io.to(socketId).emit('deliver order', JSON.stringify(order));
		});
	}
	else if (channel === 'update order'){

		// get client socket id to send to
		const promise1 = new Promise((fulfill, reject) =>{
			store.hget('activeClients', 'client_' + msg.userId, function(err, socketId){
				if (err){
					reject(err);
				}
				else{
					console.log('SOCKET ID', socketId);
					fulfill(socketId);
				}
			});
		}).catch((err) =>{
			console.log(err);
		});
		
		// get order information
		const promise2 = new Promise((fulfill, reject) =>{
			store.hgetall('order_' + msg.orderId, function(err, order){
				if (err){
					reject(err);
				}
				else{
					fulfill(order);
				}
			});
		});

		// deliver the order to listening client
		Promise.all([promise1, promise2]).then((data) =>{

			//console.log(data);
			const socketId = data[0];
			const order = data[1];

			order.id = msg.orderId;

			console.log('ORDER ID', order.id);

			// update order on client side
			io.to(socketId).emit('update order', JSON.stringify(order));
		});
	}

});

// ---- Socket.io ----

io.on('connection', socket =>{

	const session = socket.request.session;

	let user;

	// prevent app from crashing in case a user is stuck polling on dashboard
	if (!session.passport){
		socket.disconnect();
	}
	else{
		user = session.passport.user;

		console.log('connected socket', socket.id, 'with session', session.id);

		// add a bakery info (as hash set) with key session.id to the Redis client
		socket.on('start', function(){
			
			console.log(user.type);

			if (user.type === 'baker'){
				// store bakery hash in activeBakeries with user.id as key and session.id as value
				store.hset('activeBakeries', 'bakery_' + user.id, socket.id);
			}
			else{
				// store client hash in activeClients with user.id as key and session.id as value
				store.hset('activeClients', 'client_' + user.id, socket.id);
				
				// grabs the clients's most recent orders
				const promise = new Promise((fulfill, reject) =>{
					store.llen('client_' + user.id, function(err, len){
						if (err){
							reject(err);
						}
						else{
							fulfill(len);
						}
					});
				});
				promise.then((len) =>{
					return new Promise((fulfill, reject) =>{
						store.lrange('client_' + user.id, 0, len, function(err, orderIds){
							if (err){
								reject(err);
							}
							else{
								fulfill(orderIds);
							}
						});
					});
				}).then((orderIds) =>{
					const orderPromiseList = [];
					orderIds.forEach((orderId) =>{
						const orderPromise = new Promise((fulfill, reject) =>{
							store.hgetall('order_' + orderId, function(err, order){
								if (err){
									reject(err);
								}
								else{
									order.id = orderId;
									fulfill(order);
								}
							});
						});
						orderPromiseList.push(orderPromise);
					});
					Promise.all(orderPromiseList).then((data) =>{
						io.to(socket.id).emit('populate orders', JSON.stringify(data));
					});
				});
			}

			io.to(socket.id).emit('connected', 'connected successfully');
		});
	}

	socket.on('update order', function(data){
		const order = JSON.parse(data);

		// update the order progress
		store.hset('order_' + order.orderId, 'progress', order.progress, function(err){
			if (err){
				console.log(err);
			}
			else{
				console.log('updated order', order.orderId);
				pub.publish('update order', data);
			}
		});

	});

	socket.on('disconnect', function(){
		console.log('disconnected socket', socket.id, 'with session', socket.request.session.id);
		// delete user key (key is ignored if does not exist)

		if (user){
			if (user.type === 'baker'){
				store.hdel('activeBakeries', 'bakery_' + user.id, function(err){
					if (err){
						console.log(err);
					}
					else{
						console.log('deleted bakery', user.id);
					}
				});
			}
			else{
				store.hdel('activeClients', 'client_' + user.id, function(err){
					if (err){
						console.log(err);
					}
					else{
						console.log('deleted client', user.id);
					}
				});
			}
		}
	});
});

// listen
server.listen(port, function(){
	console.log('Listening on port ' + port);
});