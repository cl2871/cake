// app for a fast cake delivery service

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const yelp = require("yelp-fusion");
const fs = require('fs');

// connect to db and utilize mongoose models
require("./db");
const Bakery = mongoose.model('Bakery');

// read from config file 
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);
const conf = JSON.parse(data);

// port 8081 is default for Elastic Beanstalk
const port = process.env.port || 8081;

// ---- Setup ----

// serve static files from public
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

// ---- Yelp Credentials ----
//CONSUMER KEY AND CONSUMER SECRET, I placed it in a CONFIG FILE
yelp.accessToken(conf.consumer_key, conf.consumer_secret).then(response =>{
	const client = yelp.client(response.jsonBody.access_token)

	client.search({ term:'bakeries', location: 'New York'})
		.then(response => {
			response.jsonBody.businesses.forEach(ele => {

				const newBakery = new Bakery({
					name: ele.name,
					address: ele.location.address1,
					city: ele.location.city,
					zipcode: ele.location.zip_code,
					country: ele.location.country,
					state: ele.location.state,
					phone: ele.phone
				});

				newBakery.save(function(err, bakery) {
					if (err){
						console.log(err);
					}
				});
			
			});

 	 });
}).catch(e => {
	console.log(e);
});

// listen
app.listen(port, function(){
	console.log('Listening on port ' + port);
});