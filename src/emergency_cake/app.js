// app for a fast cake delivery service

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
//const fs = require('fs');

// ---- Variables ----
const port = process.env.port || 3000;
const PLACES_KEY = process.env.PLACES_KEY;
const YELP_KEY = process.env.YELP_KEY;

// serve static files from public
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));


// set view engine as handlebars
app.set('view engine', 'hbs');

app.get('/', (req, res) => {
	res.render('cake', {});
});

app.post('/', (req, res) => {
	res.redirect('/getCake');
});

app.get('/getCake', (req, res) => {
	res.render('order_form', {PLACES_KEY, YELP_KEY});
});

// listen
app.listen(port, function(){
	console.log('Listening on port ' + port);
});