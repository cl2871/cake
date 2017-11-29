// app for populating sample data 

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const yelp = require("yelp-fusion");
const fs = require('fs');
const bcrypt = require('bcryptjs');

// connect to db and utilize mongoose models
require("./db");
const Bakery = mongoose.model('Bakery');
const Bakery_Auth = mongoose.model('Bakery_Auth');

// read from config file 
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);
const conf = JSON.parse(data);

// ---- Setup ----

// serve static files from public
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

const limit = 50;
let offset_brah = 0;
let count = 0;

//initial call to get code running
makeCall();

// ---- Yelp Credentials ----
//CONSUMER KEY AND CONSUMER SECRET, I placed it in a CONFIG FILE
function makeCall(){
	yelp.accessToken(conf.consumer_key, conf.consumer_secret).then(response =>{
	const client = yelp.client(response.jsonBody.access_token);
		client.search({ term:'cake', location: 'New York', limit: limit, offset: offset_brah})
			.then(response => {
					response.jsonBody.businesses.forEach(ele => {
						if(ele.location.address1 && ele.phone){
							const newBakeryAuth = new Bakery_Auth({
								username: ele.id,
								password: bcrypt.hashSync(conf.pass, 10)
							});

							newBakeryAuth.save(function(err, bakery){
								if(err){
									console.log(err);
								}
							});
							const newBakery = new Bakery({
								bakeryId: newBakeryAuth._id,
								name: ele.name,
								address: ele.location.address1,
								city: ele.location.city,
								zipcode: ele.location.zip_code,
								country: ele.location.country,
								state: ele.location.state,
								phone: ele.phone
							});

							console.log(ele.name);
							newBakery.save(function(err, bakery) {
								if (err){
									console.log(err);
								}
							});
							count++;
						}
					
					});
					offset_brah += 50;
					if(offset_brah <= 100){ //Change to 950 for 1000 results
						makeCall();
					}else{
						process.exit(); //automatically exit node 
					}
			});
	}).catch(e => {
			console.log(e);		
	});
}