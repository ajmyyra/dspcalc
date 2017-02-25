// Distributed Systems Project, spring 2017
// Antti Myyrä, student number 014012055

const operations = ['+', '-', '*', '/'];

$(document).ready(function() {

	// A callback for submit event processes the form when it is submitted.
	$("#ajaxform").submit(function(event) {
		event.preventDefault();

		var arg1 = $('input[name=arg1]').val().replace(" ", "");
		console.log("New calculation! " + arg1);
		emptyStatus();

		splitArguments(arg1, function(result) {
			console.log("Final result for calculation " + arg1 + " is " + result);
		});
	});
});

// Given argument is splitted into parts that are calculated individually using the queryServer function
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
					var res = queryServer(newArg1, currArg, currOp, function(result) {
						if (callback) callback(result);
					});
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

// Communication with the server happens only through this function. 
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
			console.log(new Date() + ' Fail: ' + JSON.stringify(err));
			showError('There was an error. :(\nMore info in browser error console.');
		});
}

// As the server sends back the whole calculation, were splitting result from it.
function getResult(calculation) {
	return calculation.substring(calculation.indexOf('=') + 2);
}

// Functions below are responsible for interacting with the HTML elements on the web page.
function renderResult(result) {
	$("#results").append("<p>" + result + "</p>");
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