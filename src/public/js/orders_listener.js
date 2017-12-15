const socket = io();
const ordersDisplay = document.getElementById('ordersDisplay');


function createElementTextNode(type, text){
	/* creates an element node that has a text node child
	*/

	// create the nodes and append the text node to the element node
	const node = document.createElement(type);
	const textNode = document.createTextNode(text);
	node.appendChild(textNode);

	return node;
}

function updateDisplay(data){
	/* updates the display with a text node
	*/

	const node = createElementTextNode('p', data);
	document.body.append(node);
	
}

function updateOrdersDisplay(order){
	/* updates the display with order information
	*/

	const address = order.address;
	const node = createElementTextNode('p', address);
	ordersDisplay.append(node);
}

function main(){

	socket.emit('start');

	socket.on('connected', (data) =>{
		updateDisplay(data);
	});

	socket.on('deliver order', (data) =>{
		console.log('received');
		const order = JSON.parse(data);
		updateOrdersDisplay(order);
	});
}

document.addEventListener('DOMContentLoaded', main);