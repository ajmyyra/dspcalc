// Distributed Systems Project, spring 2017
// Antti Myyrä, student number 014012055

const operations = ['+', '-', '*', '/'];
const pi = 3.14159;
var ctx;
var canvas;
var xPadding = 50;
var yPadding = 30;
var reqCount = 0;
var cache;
var cacheInit = 1000;
var cacheHit = 0;
var cacheMiss = 0;
var cacheBacklog = {};

// Request Cache implementation for storing calculations.
// Entries are stored in entries as entries[x] = y and their addition order in order.
function Cache (size) {
	this.maxSize = 1;
	if (!isNaN(size)) {
		this.maxSize = size;
	}
	else {
		throw new Error('No suitable size given.');
	}
	
	this.entries = {};
	this.order = [];
};

// Cache functions 
Cache.prototype = {
	getMaxSize: function() {
		return this.maxSize;
	},
	setMaxSize: function(newSize) {
		newSize = parseInt(newSize);
		if (!isNaN(newSize) && newSize >= 0) {
			console.log(new Date() + ' Cache size updated: ' + this.maxSize + ' -> ' + newSize);
			this.maxSize = newSize;

			if (Object.keys(this.entries).length > this.maxSize) {
				var items = Object.keys(this.entries).length - this.maxSize;
				for (var a = 0; a < items; a++) {
					var removable = this.order.shift();
					delete this.entries[removable];
				}
			}
		}
		else {
			throw new Error('No suitable size given.');
		}
	},
	getCurrentSize: function() {
		return Object.keys(this.entries).length;
	},
	add: function(key, value, callback) { 
		if (this.maxSize <= 0) { // Cache is disabled
			return;
		}

		if (this.order.indexOf(key) > -1) { // Avoiding duplicates if a key gets updated
			this.order.splice(this.order.indexOf(key), 1);
		}

		this.entries[key] = value;
		this.order.push(key);
		
		// If cache is full, adding one causes other one to be discarded
		if (Object.keys(this.entries).length > this.maxSize) {
			var removable = this.order.shift();
			delete this.entries[removable];
		}

		if (callback) callback();
	},
	get: function(key, callback) {
		var value = this.entries[key];
		if (value == null) {
			cacheMiss++;
			if (callback) {
				callback(null);
			}
			else {
				return null;	
			}
		} else { // Moving the used value to the last of the queue before responding
			cacheHit++;
			delete this.entries[key]; 
			this.order.splice(this.order.indexOf(key), 1);
			this.entries[key] = value;
			this.order.push(key);
			if (callback) {
				callback(value);
			}
			else {
				return value;
			}
		}
		
	}
};


$(document).ready(function() {

	// A callback for submit event processes the calculation (Calculate or Simplify) when it is submitted.
	$("#ajaxform").submit(function(event) {
		event.preventDefault();
		var button = $(document.activeElement)[0].value; // Which button was pressed
		
		var arg1 = $('input[name=arg1]').val().replace(/ /g, '');
		if (arg1 === "sin(x)") {
			arg1 = "1*sin(x)";
		}
		
		if (button === 'Calculate') {
			console.log(new Date + ' New calculation: ' + arg1);
			emptyResults();
			emptyCacheStats();

			splitArguments(arg1, function(result) {
				console.log(new Date() + ' Result for calculation ' + arg1 + ' is ' + result);
				renderResult(arg1 + ' = ' + result);
				handleCacheBacklog();
			});
		}
		else {
			cacheSimplify(arg1, function(result) {
				updateCalculation(result);
			}); 
		}
		
	});

	// A callback for cachecontrol form that can be used to set new cache size.
	$("#cachecontrol").submit(function(event) {
		event.preventDefault();
		var newMax = $("#cachecontrol :input")[0].value;
		
		try {
			cache.setMaxSize(parseInt(newMax));
		}
		catch(err) {
			showError(err.message);
		}
		
		updateCacheControl();
	});

	cache = new Cache(cacheInit);
	updateCacheControl();
});

// Given argument is splitted into parts that are calculated individually using the queryServer function.
// The exception to this are the sin(x) calculations that are handled separately using the sinQuery function.
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
					showError("Argument missing.");
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
		if (arg.length == 0) {
			showError("Empty line.");
		}
		if (callback) callback(arg);
	}
}

// Similar to splitArguments function, but instead were returning only one found result.
// Function searches throug the argument and tries to find matches stored in the cache.
// If a match is found, calculation is replaced with the result and new calculation returned.
function cacheSimplify(arg, callback) {
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
						if (callback) callback(arg);
					}
					else {
						if(isNaN(currArg)) {
							showError("Unknown calculation, try again. For example: 3+5*2");
						}
						else {
							cache.get('' + newArg1 + currOp + currArg, function(result) {
								if (result == null) {
									if (callback) callback(newArg1 + currOp + currArg);
								}
								else {
									if (callback) callback(result);
								}
							});
						}
					}
				}
				else {
					showError("Argument missing.");
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
					cache.get(newArg1 + currOp + newArg2, function(result) {
						

						if (result == null) {
							cacheSimplify(newArg2 + arg.charAt(a) + currArg, function(simplResult) {
								if (callback) callback(arg.substr(0, last) + currOp + simplResult);
							});
						}
						else {
							currOp = arg.charAt(a);
							result += arg.charAt(a) + currArg;
							if (callback) callback(result);
						}
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
		if (arg.length == 0) {
			showError("Empty line.");
		}
		if (callback) callback(arg);
	}
}

// Communication with the server happens only through this function. 
// It is given simple operations to send to the server for calculation.
// Server must reside in the same host, running in or proxied from port 8080.
function queryServer(arg1, arg2, op, callback) {
	cache.get('' + arg1 + op + arg2, function(cacheResult) {
		if (cacheResult != null) {
			if (callback) callback(cacheResult);
		}
		else {
			reqCount += 1;
			var formData = {
				'arg1': arg1,
				'op': op,
				'arg2': arg2
			};

			$.ajax({
				type: 'GET',
				url: 'http://' + window.location.hostname + ':8080',
				data: formData,
				encode: true
			})
			.done(function(result) {
				var calc = splitResult(result.calculation);
				cacheBacklog[calc[0].replace(/ /g, '')] = calc[1]; // Cache is processed at the end of computation
				//cache.add(calc[0].replace(/ /g, ''), calc[1]);   // Runtime caching disabled due to inconsistencies (see Documentation)
				if (callback) callback(calc[1]);
			})
			.fail(function(err) {
				console.log("Fail: " + JSON.stringify(err));
				showError('There was an error. :(<br />More info in browser error console.');
			});
		}
	});

	
}

// As we don't alter cache during calculation, we're processing it only after an operation
// is finished. This function takes the backlog and adds its elements to the cache.
function handleCacheBacklog() {
	$.each(cacheBacklog, function(key, value) {
		cache.add(key, value);
	});
	cacheBacklog = {};
	updateCacheControl();
}

// This function serves as a main function for sin(x) plotting, calculating the plot with
// calculatePlotPoints function end sending it forward to the createSinPlot function.
function sinQuery(multiplier, callback) {
	calculatePlotPoints(multiplier, -pi, pi, 0.1, function(points) {
		createSinPlot(points, sortKeys(points), function() {
			if (callback) callback();
		});
	});
}

// Before creating the plot, we're sorting the keys in points dict, as their order is now guaranteed.
function sortKeys(dictlist) {
    var keys = [];

    for(var key in dictlist)
    {
        if(dictlist.hasOwnProperty(key))
        {
            keys.push(key);
        }
    }
    var sorted = keys.sort(function(a, b) {
    	return a - b;
    });

    return sorted;
}

// A n*sin(x) plot is created as an implementation of Taylor series below and multiplied.
// Using 8 iterations gives us an error of less than 1% from Math.sin(x) function.
function calculatePlotPoints(multiplier, beginning, end, stepsize, callback) {
	console.log(new Date() + ' Calculating plot points for ' + multiplier + '*sin(x). This will take a long time..');
	showStatus('Calculating plot points for ' + multiplier + '*sin(x). This will take a long time..');

	if ((beginning + stepsize - end) > 0) {
		console.log("Fail: no backwards plotting supported.");
		return;
	}

	var points = {};
	var iterator = beginning;
	
	for (var a = beginning; a <= end; a += stepsize) {
		points[a] = null;
		taylorSin(a, 8, function(sinResult, x) {
			queryServer(sinResult, multiplier, '*', function(multiplied) {
				points[x] = multiplied;

				iterator += stepsize;
				if (iterator >= end) {
					emptyStatus();
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

// Recursive helper function for Taylor series calculation.
// All calculations are sent to the server for processing through queryServer function.
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

// Factorial function, for example 5! = 5*4*3*2*1
// All calculations are sent to the server for processing through queryServer function.
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

// Power function, for example 4^3 = 4*4*4
// All calculations are sent to the server for processing through queryServer function.
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

// This function governs the creation of the sin plot in the frontend, using the HTML5 canvas element.
function createSinPlot(plotpoints, sortedKeys, callback) {
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

	drawGraph(ctx, axes, plotpoints, sortedKeys, maxY);
	handleCacheBacklog();
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

	ctx.fillText((-1)*(min).toFixed(2), xLoc, 10);
	for (var a = 1; a < 11; a++) {
		var value = min + a*step;
		value = (-1)*value.toFixed(2);
		ctx.fillText(value, xLoc, a*yStep);
	}
}

// Finally, we're drawing a sin(x) graph from the created plotpoints to the canvas element.
function drawGraph(ctx, axes, plotpoints, sortedKeys, maxY) {
	ctx.beginPath();
 	ctx.lineWidth = 2;
 	ctx.strokeStyle = "rgb(11,153,11)";
 	var firstpoint = true;

 	for (var a = 0; a < sortedKeys.length; a++) {
 		var x = sortedKeys[a];
 		var y = plotpoints[x];
 		if (firstpoint) {
 			ctx.moveTo(getX(parseFloat(x), axes.x0-xPadding), getY(y, axes.y0, maxY));
 			firstpoint = false;
 		}
 		else {
 			ctx.lineTo(getX(parseFloat(x), axes.x0-xPadding), getY(y, axes.y0, maxY));
 		}
 	}
	ctx.stroke();
}

// Helper functions for X and Y to find the correct point in canvas, as its 0,0 point is in the upper left corner.
function getX(x, origoWidth) {
	return ((pi+x)/pi)*origoWidth + xPadding;
}

function getY(y, origoHeight, maxY) {
	return ((maxY-y)/maxY)*origoHeight;
}

// As the server sends back the whole calculation, were splitting it to the calculation and result.
function splitResult(calculation) {
	return String(calculation).split(' = ');
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

function emptyCacheStats() {
	cacheHit = 0;
	cacheMiss = 0;
}

function updateCalculation(calculation) {
	$('input[name=arg1]').val(calculation);
}

function updateCacheControl() {
	$("#cachemax").empty();
	$("#cachecurrent").empty();
	$("#cachehits").empty();
	$("#cachemisses").empty();

	$("#cachemax").append('<b>' + cache.getMaxSize() + '</b>');
	$("#cachecurrent").append('<b>' + cache.getCurrentSize() + '</b>');
	$("#cachehits").append('<b>' + cacheHit + '</b>');
	$("#cachemisses").append('<b>' + cacheMiss + '</b>');
}

function showError(error) {
	console.log(new Date() + ' Error: ' + error);
	showStatus(error);
}