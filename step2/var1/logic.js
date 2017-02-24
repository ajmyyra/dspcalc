const operations = ['+', '-', '*', '/'];
const pi = 3.14159;

$(document).ready(function() {
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

function sinQuery(multiplier, callback) {
	console.log("Query for " + multiplier + " x sin(x)."); //debug

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
			if (multiplier > 1) {
				renderResult(multiplier + " * sin(x)");
			}
			else {
				renderResult("sin(x)");
			}
			
			renderSinResult(result);
		})
		.fail(function(err) {
			console.log("Fail: " + JSON.stringify(err));
			showError('There was an error. :(\nMore info in browser error console.');
		});
	});
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

function getResult(calculation) {
	return calculation.substring(calculation.indexOf('=') + 2);
}

function showError(error) {
	console.log(new Date() + ' Error: ' + error);
	showStatus('Error: ' + error);
}