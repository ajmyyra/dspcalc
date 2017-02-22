const operations = ['+', '-', '*', '/'];
const pi = 3.14159;
var ctx;
var canvas;
var xPadding = 50;
var yPadding = 30;
var reqCount = 0;

$(document).ready(function() {
	$("#ajaxform").submit(function(event) {
		event.preventDefault();

		var arg1 = $('input[name=arg1]').val().replace(" ", "");
		
		console.log(new Date + ' New calculation: ' + arg1);
		emptyResults();
		
		if (arg1 === "sin(x)") {
			arg1 = "1*sin(x)";
		}

		splitArguments(arg1, function(result) {
			console.log(new Date() + ' Result for calculation ' + arg1 + ' is ' + result);
			renderResult(arg1 + ' = ' + result);
		});
	});
});

function splitArguments(arg, callback) {
	if (isNaN(arg)) {
		var origLength = arg.length;
		var newArg1;
		var newArg2;
		var currOp;
		var currArg;
		var last;
		var firstFound = false;

		for (var a = 1; a < origLength; a++) {
			if (a >= (origLength - 1)) {
				if (firstFound) {

					if (currArg === "sin(x)" && currOp == '*') {
						sinQuery(newArg1, function() {
							console.log(new Date() + ' Calculated sin for ' + newArg1 + '*' + currArg);
						});
					}
					else {
						if(isNaN(currArg)) {
							showError("Unknown calculation, try again. For example: 3+5*2");
						}
						else {
							var res = queryServer(newArg1, currArg, currOp, function(result) {
								if (callback) callback(result);
							});	
						}
					}
				}
				else {
					showError("Given argument is empty.");
				}
			}

			if (operations.indexOf(arg.charAt(a)) > -1) {

				// Check for numbers with exponent (for example 6.06e+3)
				if ((arg.charAt(a) == '+') && (arg.charAt(a-1) == 'e')) {
					continue;
				}

				if (firstFound) {
					newArg2 = arg.substring(last+1, a);
					currArg = arg.substr(a+1);
					queryServer(newArg1, newArg2, currOp, function(result) {
						currOp = arg.charAt(a);
						result += currOp + "" + currArg;
						splitArguments(result, function(result) {
							if (callback) callback(result);
						});
					});
					break;
				}
				else {
					currOp = arg.charAt(a);
					newArg1 = arg.substr(0, a);
					currArg = arg.substr(a+1);
					firstFound = true;
					last = a;
				}
			}
		}
	}
	else {
		console.log("Returning only the argument " + arg);
		if (callback) callback(arg);
	}
}

function queryServer(arg1, arg2, op, callback) {
	reqCount += 1;

	var formData = {
		'arg1': arg1,
		'op': op,
		'arg2': arg2
	};

	$.ajax({
			type: 'GET',
			url: 'http://' + window.location.hostname + ':8081',
			data: formData,
			encode: true
		})
		.done(function(result) {
			if (callback) callback(getResult(result.calculation));
		})
		.fail(function(err) {
			console.log("Fail: " + JSON.stringify(err));
			showError('There was an error. :(<br />More info in browser error console.');
		});
}

function sinQuery(multiplier, callback) {
	calculatePlotPoints(multiplier, -pi, pi, 0.1, function(points) {
		createSinPlot(points, function() {
			if (callback) callback();
		});
	});
}

function calculatePlotPoints(multiplier, beginning, end, stepsize, callback) {
	var points = {};
	console.log(new Date() + ' Calculating plot points for ' + multiplier + '*sin(x). This will take a long time..');

	if ((beginning + stepsize - end) > 0) {
		console.log("Fail: no backwards plotting supported.");
		return;
	}

	var iterator = beginning;
	
	// We're approximating sin(x) with 8 iterations,
	// smallest possible without variation over 1%
	for (var a = beginning; a <= end; a += stepsize) {
		taylorSin(a, 8, function(sinResult, x) {
			queryServer(sinResult, multiplier, '*', function(multiplied) {
				points[x] = multiplied;

				iterator += stepsize;
				if (iterator >= end) {
					console.log(new Date() + ' Plot points calculated! Now rendering it.');
					if (callback) callback(points);
				}
			});

		}); 
	}
}

// Implementation of sin(x) function, based on Taylor Series.
// http://people.math.sc.edu/girardi/m142/handouts/10sTaylorPolySeries.pdf
function taylorSin(x, iterNum, callback) {
	var result = x;
    
   	for (var a = 1; a <= iterNum; a++) {
   		if ((a % 2) == 0) {
        	//result += power(x, x, (2*a + 1)) / factorial(2*a + 1);
        	taylorize(x, a, function(taylorResult, iter) {
        		queryServer(result, taylorResult, '+', function(addition) {
        			result = addition;

        			if (iter >= iterNum) {
        				if (callback) callback(result, x);
        			}
        		});
        	});
        }
        else {
            //result -= power(x, x, (2*a + 1)) / factorial(2*a + 1);
            taylorize(x, a, function(taylorResult, iter) {
        		queryServer(result, taylorResult, '-', function(addition) {
        			result = addition;

        			if (iter >= iterNum) {
        				if (callback) callback(result, x);
        			}
        		});
        	});
        }        
    }
}

function taylorize(x, a, callback) {
	queryServer(2, a, '*', function(multiplication) {
		queryServer(multiplication, 1, '+', function(plus) {
			power(x, x, plus, function(powerResult) {
				factorial(plus, function(factorialResult) {
					queryServer(powerResult, factorialResult, '/', function(taylorResult) {
						if (callback) callback(taylorResult, a);
					});
				});
			});
		});
	});
}

function factorial(num, callback) {
	if (num <= 1) {
        if (callback) callback(1);
    } else {
    	factorial(num - 1, function(result) {
    		queryServer(num, result, '*', function(returnedResult) {
    			if (callback) callback(parseInt(returnedResult));
    		});
    	});
    }
}

function power(result, num, pow, callback) {
	queryServer(result, num, '*', function(returnedResult) {
    	pow--;
    	returnedResult = parseFloat(returnedResult);
       	if (pow > 1) {
    		power(returnedResult, num, pow, function(newResult) {
    			if (callback) callback(parseFloat(newResult));
    		})
    	}
    	else {
    		if (callback) callback(returnedResult);
    	}
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

function renderResult(result) {
	$("#results").append("<p>" + result + "</p>");
}

function emptyResults() {
	$("#results").empty();
	if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function getResult(calculation) {
	return calculation.substring(calculation.indexOf('=') + 2);
}

function showError(error) {
	console.log(new Date() + ' Error: ' + error);
}