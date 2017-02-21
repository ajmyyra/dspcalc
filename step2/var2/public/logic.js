const operations = ['+', '-', '*', '/'];
const pi = 3.14159;
var ctx;
var canvas;
var xPadding = 50;
var yPadding = 30;

$(document).ready(function() {
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

function splitArguments(arg, callback) {
	console.log("Splitting argument " + arg); //debug

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
		console.log("Returning only the argument " + arg); //debug
		if (callback) callback(arg);
	}
}

function sinQuery(multiplier, callback) {
	console.log("Creating a plot for " + multiplier + "*sin(x)"); //debug
	calculatePlotPoints(multiplier, -pi, pi, 0.01, function(points) {
		createSinPlot(points, function() {
			if (callback) callback();
		});
	});
}


function createSinPlot(plotpoints, callback) {
	canvas = $('#plot')[0];
	var axes = {}
	ctx = canvas.getContext('2d');
	var maxY = 0;

	$.each(plotpoints, function(x, y) {
 		if (y > maxY) maxY = y;
 	});
 	console.log(maxY); //debug

	axes.x0 = 0.5*(canvas.width + xPadding);
	axes.y0 = 0.5*(canvas.height - yPadding);
	axes.scale = 4;
	
	renderAxes(ctx, axes);
	renderXLegend(ctx, -pi, pi, axes);
	renderYLegend(ctx, -maxY, maxY, axes);

	drawGraph(ctx, axes, plotpoints, maxY);
	if (callback) callback();
}

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

function drawGraph(ctx, axes, plotpoints, maxY) {
	ctx.beginPath();
 	ctx.lineWidth = 2;
 	ctx.strokeStyle = "rgb(11,153,11)";
 	var firstpoint = true;

 	$.each(plotpoints, function(x, y) {
 		console.log("x: " + x + " (" + getX(parseFloat(x), axes.x0) + "), y: " + y + " (" + getY(y, axes.y0, maxY) + ")"); //debug
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

function getX(x, origoWidth) {
	return ((pi+x)/pi)*origoWidth + xPadding;
}

function getY(y, origoHeight, maxY) {
	return ((maxY-y)/maxY)*origoHeight;
}

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

function factorial(num) {
    if (num <= 1) {
        return 1;
    } else {
        return num * factorial(num - 1);
    }
}

function power(num, pow) {
    var result = 1;
    for (var i = 0; i < pow; i++) {
        result = result * num;
    }
    return result;
}

function renderResult(result) {
	$("#results").append("<p>" + result + "</p>");
}

function emptyResults() {
	$("#results").empty();
	if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function showError(error) {
	alert(error);
}