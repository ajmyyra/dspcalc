// Distributed Systems Project, spring 2017
// Antti Myyrä, student number 014012055

var http = require('http');
var url = require('url');
var gnuplot = require('gnuplot');
var fs = require('fs');
var path = require('path');
var config = require('./config');
const serverport = config.serverport;
const origin = config.origin;
const tempPlotFile = config.plotfile;
const sinPlotFile = config.sinfile;

function handleRequest(request, response) {
	response.setHeader('Access-Control-Allow-Origin', origin);

	if (request.method === 'GET') {
		var params = url.parse(request.url, true);

		// For sin(x) plot creation with pre-calculated plotpoints
		if (params.query.op === 'sinselfcreated') {
			
            var filePath = path.join(__dirname, sinPlotFile);
            
            handleSinFormData(params.query, function(result) {
            	createSinPlot(result, function(plotfile) {
            		console.log(new Date() + ' Temporary plot image file ' + plotfile + ' created succesfully.');
            		
            		// Timeout is needed as gnuplot is executed in async manner, ending when file isn't
            		// yet saved to disk. We'll wait for 100 milliseconds for it. Other possibility is
            		// to set up fs.watch(), but it's still unstable and fires 2-N times.
            		setTimeout(function(){
            			fs.readFile(filePath, function(err, data) {
    						response.writeHead(200, {
    							'Content-Type': 'image/png'
    						});
    						response.end(new Buffer(data).toString('base64'), function() {
    							console.log(new Date() + ' Succesfully returned sin plot image to client.');
    							fs.unlink(tempPlotFile, function() {
    								console.log(new Date() + ' Temporary datafile ' + tempPlotFile + ' for gnuplot deleted.');
    							});
    							fs.unlink(sinPlotFile, function() {
    								console.log(new Date() + ' Temporary plot image file ' + sinPlotFile + ' deleted.');
    							});
    						});
    					});
    				}, 100);
            	});
            });
            return;
		}

		// Common calculation. All the parameters are pre-checked before calculation is allowed.
        if (isNumber(params.query.arg1) && isAllowedMethod(params.query.op) && isNumber(params.query.arg2)) {
         	result = calculate(params.query.arg1, params.query.arg2, params.query.op);
            var calculation = "" + params.query.arg1 + " " + params.query.op + " " + params.query.arg2 + " = " + result;

         	console.log(new Date() + ' Returning result: ' + calculation);
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify( { 'calculation': calculation } ));
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
			return (arg1 / arg2);
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

// As the plot was required to be sent over HTTP GET, it needs to be processed for plotpoints.
function handleSinFormData(params, callback) {
	var regexp = /\[([^\]]+)\]/;
	var plotpoints = {};

	for (var property in params) {
		if (property.match(/^plot\[/)) {
        	var key = regexp.exec(property)[1];
        	plotpoints[key] = params[property];
        }
    }

    if (callback) callback(plotpoints);
}

// We'll create the plot using Gnuplot.
// Plotpoints are saved into a file for gnuplot to more easily process them.
function createSinPlot(plotpoints, callback) {
	var stream = fs.createWriteStream(tempPlotFile);
	stream.once('open', function(fd) {
		stream.write("# Temporary data file for n*sin(x) data points\n");

		for (x in plotpoints) {
			stream.write(x + "\t" + plotpoints[x] + "\n");
		}

		stream.on('close', function() {
			console.log(new Date() + ' Temporary datafile for gnuplot created succesfully.');
			var plot = gnuplot()
				.set('term png')
				.set('output "' + sinPlotFile + '"')
				.set('notitle')
				.set('nokey')
				.plot('"' + tempPlotFile + '" with lines')
				.end();

			callback(sinPlotFile); 
		});


		stream.end();
	});
}

// Image file is converted to base64 encoding for the browser to be able to show it.
function base64_encode(file) {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

var server = http.createServer(handleRequest);
server.listen(serverport, function() {
	console.log("Server listening on port " + serverport);
});