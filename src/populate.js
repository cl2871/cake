// app for populating sample data 

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----
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

const limit = 50;
let offset = 0;

//initial call to get code running
makeCall();

// ---- Yelp Credentials ----
// CONSUMER KEY AND CONSUMER SECRET, I placed it in a CONFIG FILE
function makeCall(){
	
	// get the access token 
	yelp.accessToken(conf.consumer_key, conf.consumer_secret).then(response =>{
	
	// do a search with the access token 
	const client = yelp.client(response.jsonBody.access_token);
		
		// search for Cake in New York
		client.search({ term:'cake', location: 'New York', limit: limit, offset: offset})
			.then(response => {
					// get results 
					response.jsonBody.businesses.forEach(ele => {

						// make sure the data has an address or phone number
						if(ele.location.address1 && ele.phone){

							// register Bakery account (for authentication)
							const newBakeryAuth = new Bakery_Auth({
								username: ele.id,
								password: bcrypt.hashSync(conf.pass, 10) //hash/salt password
							});

							// save data into database
							newBakeryAuth.save(function(err, bakery){
								if(err){
									console.log(err);
								}
							});

							// create Bakery object that references the Bakery account
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

							// save data into database
							newBakery.save(function(err, bakery) {
								if (err){
									console.log(err);
								}
							});
						}
					});

					// increase offset by 50 (get the next set of 50 bakeries)
					offset += 50;

					// MAX RESULT YELP ALLOWS IS 1000, else yelp will send back error
					if(offset <= 100){ // change to 950 to get about 1000 results
						makeCall();	// continue polling data 
					}else{
						process.exit(); // automatically exit node 
					}
			});
	}).catch(e => {
			console.log(e);		
	});
}