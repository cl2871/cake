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

function updateOrdersDisplay(orders){
	/* creates an element node that has a text node child
	*/

	const ordersQueue = orders.split(',');

	// clear out the display
	while (ordersDisplay.hasChildNodes()) {
		ordersDisplay.removeChild(ordersDisplay.lastChild);
	}

	ordersQueue.forEach((order) =>{
		const node = createElementTextNode('p', order);
		ordersDisplay.append(node);
	});
}

function main(){

	socket.emit('start', {message: 'Connected'});

	socket.on('deliver order', (orders) =>{
		updateOrdersDisplay(orders);
	});
}

document.addEventListener('DOMContentLoaded', main);