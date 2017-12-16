# Cake Delivery App
### By: Ashley Hu, Brandon Su, Chris Luo, Dora Sun

We created a scalable cake delivery application that will deliver cake to users. Users are able to order a cake through the web application. A bakery is immediately able to receive the request and can proceed to update the progress of the cake via an online tracker that users are able to see. Once the cake is done processing, it’ll be delivered to the user.

## General Setup Guide (AWS)

### AWS Elastic Beanstalk

Add environment variables to Software Configuration (or alternatively provide a config file).
Beanstalk by default listens on port 8081.

### ElastiCache

Note: should have default VPC
Add Custom TCP inbound rule on EC2 instance for port 6379.
Ensure redis clients in node.js code call the ElastiCache endpoint.

## General Setup Guide (local)

Add environment variables or utilize a config file.
Have redis running on local machine.
Ensure redis clients in node.js code call local endpoint (localhost).

## Running the App
Command: npm start
^ run this from top level directory (can also run node src/app.js)

## Testing the App
User Login
- email: test@gmail.com
- password: 1234

Bakery Login:
- username: silk-cakes-forest-hills
- password: password

Log into a user and log into a bakery (one in a normal browser tab, one in incognito).
User should be able to make an order, and it should show up on both the user dashboard and bakery dashboard.
Bakery can update the progress of the order, which should show up on both dashboards.

Note: in order for a user to make an order, a bakery has to be logged in.
Note: redis data can be reset by the /redis/reset route if needed

## Directory Structure

- src/					contains all sources files
-    /app.js				main application
-    /db.js				contains data models and MongoDB/mongoose setup
-    /populate.js       		contains code for populating MongoDB with Yelp data
-    /views/ 				contains the hbs files (html with templating)
-    /public/ 				contains all public files such as css, img, js
-           /js/			js files
-              /orders_listener.js	code for socket connection and bakery dashboard
-              /orders_tracker.js	code for socket connection and client dashboard



