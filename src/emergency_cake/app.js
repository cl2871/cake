// app for a fast cake delivery service

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
//const fs = require('fs');

// ---- Variables ----

// port 8081 is default for Elastic Beanstalk
const port = process.env.port || 8081;
const PLACES_KEY = process.env.PLACES_KEY;
const YELP_KEY = process.env.YELP_KEY;

const fakeDB = [];

// serve static files from public
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

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
	fakeDB.push(req.body);
	res.redirect('/bakeries');
});

app.get('/bakeries', (req, res) => {
	res.render('bakeries', {fakeDB: fakeDB});
});

// listen
app.listen(port, function(){
	console.log('Listening on port ' + port);
});