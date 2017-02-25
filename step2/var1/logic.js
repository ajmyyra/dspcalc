// Distributed Systems Project, spring 2017
// Antti Myyrä, student number 014012055

const operations = ['+', '-', '*', '/'];
const pi = 3.14159;

$(document).ready(function() {

	// A callback for submit event processes the form when it is submitted.
	$("#ajaxform").submit(function(event) {
		event.preventDefault();

		var arg1 = $('input[name=arg1]').val().replace(" ", "");
		
		console.log(new Date() + " New calculation: " + arg1);
		emptyResults();

		if (arg1 === "sin(x)") {
			arg1 = "1*sin(x)"
		}

		splitArguments(arg1, function(result) {
			console.log(new Date() + " Final result for calculation " + arg1 + " is " + result);
		});
	});
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
							console.log(new Date() + "Calculated sin for " + newArg1 + "*" + currArg);
						});
					}
					else {
						var res = queryServer(newArg1, currArg, currOp, function(result) {
							if (callback) callback(result);
						});
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
		if (callback) callback(arg);
	}
}

// Communication with the server happens only through this function, with the exception of sin(x) plotting. 
// It is given simple operations to send to the server for calculation.
// Server must reside in the same host, running in or proxied from port 8080.
function queryServer(arg1, arg2, op, callback) {
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
			renderResult(result.calculation);
			if (callback) callback(getResult(result.calculation));
		})
		.fail(function(err) {
			console.log("Fail: " + JSON.stringify(err));
			showError('There was an error. :(\nMore info in browser error console.');
		});
}

// This function communicates with the server by sending it the n*sin(x) plot that is
// calculated using the calculatePlotPoints function.
function sinQuery(multiplier, callback) {
	calculatePlotPoints(multiplier, -pi, pi, 0.1, function(calculation) {
		var formData = {
			'op': 'sinselfcreated',
			'plot': calculation
		};

		$.ajax({
			type: 'GET',
			url: 'http://' + window.location.hostname + ':8080',
			data: formData,
			encode: true
		})
		.done(function(result) {
			if (multiplier == 1) {
				renderResult("sin(x)");
			}
			else {
				renderResult(multiplier + " * sin(x)");
			}
			
			renderSinResult(result);
		})
		.fail(function(err) {
			console.log("Fail: " + JSON.stringify(err));
			showError('There was an error. :(\nMore info in browser error console.');
		});
	});
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

// As the server sends back the whole calculation, were splitting result from it.
function getResult(calculation) {
	return calculation.substring(calculation.indexOf('=') + 2);
}

// Functions below are responsible for interacting with the HTML elements on the web page.
function renderResult(result) {
	$("#results").append("<p>" + result + "</p>");
}

function renderSinResult(data) {
	$("#results").append('<p><img src="data:image/png;base64,' + data + '" /></p>');
}

function emptyResults() {
	$("#results").empty();
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