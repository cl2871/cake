AWS Elastic Beanstalk

Software Configuration
   Node command: npm start
   // start script in package.json will run node app.js
   Environment Properties: PLACES_KEY, YELP_KEY
   // input api keys as environment variables

Scaling
   Environment type: Load balanced, auto scaling

app.js
   port 8081
   // port that EB uses