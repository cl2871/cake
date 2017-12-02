// app for a fast cake delivery service

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
//const fs = require('fs');

// connect to db and utilize mongoose models
require("./db");
const User = mongoose.model('User');
const Bakery = mongoose.model('Bakery');
const Order = mongoose.model('Order');

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

	const postal = req.query.postal;

	Bakery.find({zipcode: postal}, function(err, bakeries){
		if (err){
			console.log(err);
		}
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