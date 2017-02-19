const operations = ['+', '-', '*', '/'];

$(document).ready(function() {
	$("#ajaxform").submit(function(event) {
		event.preventDefault();

		var arg1 = $('input[name=arg1]').val().replace(" ", "");
		console.log("New calculation! " + arg1);

		splitArguments(arg1, function(result) {
			console.log("Final result for calculation " + arg1 + " is " + result);
		});
	});
});

function splitArguments(arg, callback) {
	console.log("Splitting argument " + arg); //debug

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
						console.log("Returning result: " + result); //debug
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
					console.log("First already found. First: " + newArg1 + ", second: " + newArg2 + ", op: " + currOp + ", currArg: " + currArg); //debug
					queryServer(newArg1, newArg2, currOp, function(result) {
						console.log("Query returned result: " + result);
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
	console.log("Query with: " +  arg1 + ", " + arg2 + ", " + op); //debug

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
			renderResult(arg1, arg2, op, result.result);
			if (callback) callback(result.result);
		})
		.fail(function(err) {
			console.log("Fail: " + JSON.stringify(err));
			showError('There was an error. :(\nMore info in browser error console.');
		});
}

function renderResult(arg1, arg2, op, result) {
	$("#results").append("<p>" 
		+ arg1 + " " 
		+ op + " " 
		+ arg2 + " = " 
		+ result + "</p>");
}

function showError(error) {
	alert(error);
}