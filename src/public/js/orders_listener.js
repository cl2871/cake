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

	const div = document.createElement('div');
	div.setAttribute('id', order.id);
	const address = order.address;
	const node = createElementTextNode('p', address);

	const progDiv = document.createElement('div');
	progDiv.setAttribute('class', 'progress');

	const progBar = document.createElement('div');
	progBar.setAttribute('class', 'progress-bar');
	progBar.setAttribute('style', 'width:0%');
	progDiv.appendChild(progBar);

	const label0 = document.createElement('div');
	label0.setAttribute('class', 'bar-step');
	label0.setAttribute('style', 'left: 7%');
	const label0text = document.createElement('div');
	label0text.setAttribute('class', 'label-txt');
	label0text.textContent = "Order Created";
	label0.appendChild(label0text);
	progBar.appendChild(label0);

	const label25 = document.createElement('div');
	label25.setAttribute('class', 'bar-step');
	label25.setAttribute('style', 'left: 28%');
	const label25text = document.createElement('div');
	label25text.setAttribute('class', 'label-txt');
	label25text.textContent = "Order Received";
	label25.appendChild(label25text);
	progBar.appendChild(label25);

	const label50 = document.createElement('div');
	label50.setAttribute('class', 'bar-step');
	label50.setAttribute('style', 'left: 47%');
	const label50text = document.createElement('div');
	label50text.setAttribute('class', 'label-txt');
	label50text.textContent = "Processing Cake";
	label50.appendChild(label50text);
	progBar.appendChild(label50);

	const label75 = document.createElement('div');
	label75.setAttribute('class', 'bar-step');
	label75.setAttribute('style', 'left: 68%');
	const label75text = document.createElement('div');
	label75text.setAttribute('class', 'label-txt');
	label75text.textContent = "Cake in Transit";
	label75.appendChild(label75text);
	progBar.appendChild(label75);

	const label100 = document.createElement('div');
	label100.setAttribute('class', 'bar-step');
	label100.setAttribute('style', 'right: 7%');
	const label100text = document.createElement('div');
	label100text.setAttribute('class', 'label-txt');
	label100text.textContent = "Cake Delivered";
	label100.appendChild(label100text);
	progBar.appendChild(label100);

	div.appendChild(node);
	div.appendChild(progDiv);

	const updateBtn = document.createElement('button');
	updateBtn.textContent = "Completed";
	updateBtn.addEventListener('click', function(evt){
		let width = progBar.style.width;
		width = +(width.slice(0, width.length -1));

		progBar.style.width = width + 25 + '%';

		const msg = {
			progress: progBar.style.width,
			orderId: order.id,
			userId: order.userId
		};

		socket.emit('update order', JSON.stringify(msg));
	});
	div.appendChild(updateBtn);

	ordersDisplay.appendChild(div);
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