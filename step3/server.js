var http = require('http');
var url = require('url');
const serverport = 8080;
const origin = 'http://localhost:8000';

function handleRequest(request, response) {
	response.setHeader('Access-Control-Allow-Origin', origin);

	if (request.method === 'GET') {
		var params = url.parse(request.url, true);

        if (isNumber(params.query.arg1) && isAllowedMethod(params.query.op) && isNumber(params.query.arg2)) {
         	result = calculate(params.query.arg1, params.query.arg2, params.query.op);
            
         	console.log(new Date() + ' All parameters correct, returning with result: ' + result);
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify( { 'result': result } ));
        }
        else {
        	console.log(new Date() + ' One or more parameters missing/wrong.');
        	console.log(params.query);
           	badRequest(response);
        }
	}
	else {
		console.log(new Date() + ' Wrong HTTP method.');
		badRequest(response);
	}
}

function calculate(arg1, arg2, op) {
	arg1 = parseFloat(arg1);
	arg2 = parseFloat(arg2);

	switch(op) {
		case '+':
			return arg1 + arg2;
			break;
		case '-':
			return arg1 - arg2;
			break;
		case '*':
			return arg1 * arg2;
			break;
		case '/':
			return (arg1 / arg2).toPrecision(3);
		default:
			return null;
	}
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function isAllowedMethod(m) {
	return (m === '+') || (m === '-') || (m === '*') || (m === '/');
}

function badRequest(response) {
	response.statusCode = 400;
	response.end();
}

var server = http.createServer(handleRequest);
server.listen(serverport, function() {
	console.log("Server listening on port " + serverport);
});