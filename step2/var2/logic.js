// Distributed Systems Project, spring 2017
// Antti Myyrä, student number 014012055

const operations = ['+', '-', '*', '/'];
const pi = 3.14159;
var ctx;
var canvas;
var xPadding = 50;
var yPadding = 30;

$(document).ready(function() {

	// A callback for submit event processes the form when it is submitted.
	$("#ajaxform").submit(function(event) {
		event.preventDefault();

		var arg1 = $('input[name=arg1]').val().replace(" ", "");
		
		console.log(new Date() + ' New calculation: ' + arg1);
		emptyResults();
		renderResult(arg1);

		if (arg1 === "sin(x)") {
			arg1 = "1*sin(x)";
		}

		splitArguments(arg1, function(result) {
			console.log(new Date() + ' ' + result);
		});
	});
});

// Given argument is splitted into parts that are calculated individually using the queryServer function.
// The exception to this are the sin(x) calculations that are handled separately using the sinQuery function.
function splitArguments(arg, callback) {
	if (isNaN(arg)) {
		var origLength = arg.length;
		var newArg1;
		var currOp;
		var currArg;
		var firstFound = false;

		for (var a = 1; a < origLength; a++) {
			if (a >= (origLength - 1)) {
				if (firstFound && currArg === "sin(x)" && currOp == '*') {
					sinQuery(newArg1, function() {
						if (callback) callback("Calculated sin for " + newArg1 + "*" + currArg);
					});
				}
				else {
					showError("Erroneous arguments.\nUsage: n*sin(x) or just sin(x)");
					break;
				}
			}

			if (operations.indexOf(arg.charAt(a)) > -1) {

				if (firstFound) {
					showError("More than one calculation not allowed.\nUsage: n*sin(x) or just sin(x)");
					break;
				}
				else {
					currOp = arg.charAt(a);
					newArg1 = arg.substr(0, a);
					currArg = arg.substr(a+1);
					firstFound = true;
				}
			}
		}
	}
	else {
		if (arg.length == 0) {
			showError("Empty line.");
		}
		if (callback) callback(arg);
	}
}

// This function serves as a main function for sin(x) plotting, calculating the plot with
// calculatePlotPoints function end sending it forward to the createSinPlot function.
function sinQuery(multiplier, callback) {
	calculatePlotPoints(multiplier, -pi, pi, 0.01, function(points) {
		createSinPlot(points, function() {
			if (callback) callback();
		});
	});
}


// This function governs the creation of the sin plot in the frontend, using the HTML5 canvas element.
function createSinPlot(plotpoints, callback) {
	canvas = $('#plot')[0];
	var axes = {}
	ctx = canvas.getContext('2d');
	var maxY = 0;

	$.each(plotpoints, function(x, y) {
 		if (y > maxY) maxY = y;
 	});

	axes.x0 = 0.5*(canvas.width + xPadding);
	axes.y0 = 0.5*(canvas.height - yPadding);
	axes.scale = 4;
	
	renderAxes(ctx, axes);
	renderXLegend(ctx, -pi, pi, axes);
	renderYLegend(ctx, maxY, -maxY, axes);

	drawGraph(ctx, axes, plotpoints, maxY);
	if (callback) callback();
}

// This function renders the axes on the canvas element.
function renderAxes(ctx, axes) {
	ctx.beginPath();
 	ctx.strokeStyle = 'rgb(128,128,128)';
 	ctx.font = 'italic 8pt sans-serif';
	ctx.textAlign = 'center';

 	ctx.moveTo(xPadding, axes.y0);
 	ctx.lineTo(ctx.canvas.width, axes.y0);

 	ctx.moveTo(axes.x0, 0);
 	ctx.lineTo(axes.x0, ctx.canvas.height-yPadding);

 	ctx.stroke();
}

// We're rendering X and Y legends to the graph with their individual functions.
function renderXLegend(ctx, min, max) {
	var step = (max - min) / 10;
	var xStep = (ctx.canvas.width - xPadding)/10;
	var yLoc = ctx.canvas.height - yPadding/2;

	for (var a = 0; a < 11; a++) {
		var value = min + a*step;
		value = value.toFixed(2);
		ctx.fillText(value, xPadding + a*xStep, yLoc);
	}
	ctx.stroke();
}

function renderYLegend(ctx, min, max) {
	var step = (max - min) / 10;
	var yStep = (ctx.canvas.height - yPadding)/10;
	var xLoc = xPadding/2;

	ctx.fillText((min).toFixed(2), xLoc, 10);
	for (var a = 1; a < 11; a++) {
		var value = min + a*step;
		value = value.toFixed(2);
		ctx.fillText(value, xLoc, a*yStep);
	}
}

// Finally, we're drawing a sin(x) graph from the created plotpoints to the canvas element.
function drawGraph(ctx, axes, plotpoints, maxY) {
	ctx.beginPath();
 	ctx.lineWidth = 2;
 	ctx.strokeStyle = "rgb(11,153,11)";
 	var firstpoint = true;

 	$.each(plotpoints, function(x, y) {
 		if (firstpoint) {
 			ctx.moveTo(getX(parseFloat(x), axes.x0-xPadding), getY(y, axes.y0, maxY));
 			firstpoint = false;
 		}
 		else {
 			ctx.lineTo(getX(parseFloat(x), axes.x0-xPadding), getY(y, axes.y0, maxY));
 		}
 	});
	ctx.stroke();
}

// Helper functions for X and Y to find the correct point in canvas, as its 0,0 point is in the upper left corner.
function getX(x, origoWidth) {
	return ((pi+x)/pi)*origoWidth + xPadding;
}

function getY(y, origoHeight, maxY) {
	return ((maxY-y)/maxY)*origoHeight;
}

// A n*sin(x) plot is created as an implementation of Taylor series below and multiplied.
// Using 20 iterations gives us an error of less than 0.01% from Math.sin(x) function.
function calculatePlotPoints(multiplier, beginning, end, stepsize, callback) {
	var points = {};

	if ((beginning + stepsize - end) > 0) {
		console.log("Fail: no backwards plotting supported.");
		return;
	}

	for (var a = beginning; a <= end; a += stepsize) {
		points[a] = multiplier*taylorSin(a, 20);
	}

	if (callback) callback(points);
}

// Implementation of sin(x) function, based on Taylor Series.
// http://people.math.sc.edu/girardi/m142/handouts/10sTaylorPolySeries.pdf
function taylorSin(x, iterNum) {
    var result = x;

    for (var a = 1; a <= iterNum; a++) {
        if ((a % 2) == 0) {
            result += power(x, (2*a + 1)) / factorial(2*a + 1);
        }
        else {
            result -= power(x, (2*a + 1)) / factorial(2*a + 1);
        }
    }

    return result;
}

// Factorial function, for example 5! = 5*4*3*2*1
function factorial(num) {
    if (num <= 1) {
        return 1;
    } else {
        return num * factorial(num - 1);
    }
}

// Power function, for example 4^3 = 4*4*4
function power(num, pow) {
    var result = 1;
    for (var i = 0; i < pow; i++) {
        result = result * num;
    }
    return result;
}

// Functions below are responsible for interacting with the HTML elements on the web page.
function renderResult(result) {
	$("#results").append("<p>" + result + "</p>");
}

function emptyResults() {
	$("#results").empty();
	if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	emptyStatus();
}

function showStatus(status) {
	$("#status").append("<p>" + status + "</p>");
}

function emptyStatus() {
	$("#status").empty();
}

function showError(error) {
	console.log(new Date() + ' Error: ' + error);
	showStatus(error);
}