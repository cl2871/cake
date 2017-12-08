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

function updateOrdersDisplay(ordersQueue){
	/* creates an element node that has a text node child
	*/

	// clear out the display
	while (ordersDisplay.hasChildNodes()) {
		ordersDisplay.removeChild(ordersDisplay.lastChild);
	}

	ordersQueue.forEach((order) =>{
		const node = createElementTextNode('p', order.address);
		ordersDisplay.append(node);
	});
}

function main(){

	socket.emit('start', {message: 'Connected'});

	socket.on('deliver order', (ordersQueue) =>{
		updateOrdersDisplay(ordersQueue);
	});
}

document.addEventListener('DOMContentLoaded', main);