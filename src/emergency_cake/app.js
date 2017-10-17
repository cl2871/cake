// app for an emergency cake delivery service

// run ./node_modules/.bin/eslint src/* to check for errors

// ---- Imports ----

const express = require('express');
const app = express();
const path = require("path");
//const fs = require('fs');

const port = process.env.port || 3000;

// serve static files from public
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

/*function getLocation() {
	function getPos(position){
		const pos = {};
		pos["latitude"] = position.coords.latitude;
		pos["longitude"] = position.coords.longitude;
		console.log("Pos: " + pos);
		return pos;
	}
	if ("geolocation" in navigator) {
		console.log("geo");
		return navigator.geolocation.getCurrentPosition(getPos);
	}
	else {
		console.log("Zero");
		return 0;
	}
}*/


// set view engine as handlebars
app.set('view engine', 'hbs');

app.get('/', (req, res) => {
	res.render('cake', {});
});

app.post('/', (req, res) => {
	res.redirect('/getCake');
});

app.get('/getCake', (req, res) => {
	/*const pos = getLocation();
	if(pos){
		console.log("Lat: " + pos["latitude"]);
	}*/
	//res.sendFile(path.join(__dirname, '../emergency_cake/public', '/html/form_google.html'));
	res.render('form_address', {});
});

// listen
app.listen(port, function(){
	console.log('Listening on port ' + port);
});