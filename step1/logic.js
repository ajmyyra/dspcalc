$(document).ready(function() {
	$("#ajaxform").submit(function(event) {
		event.preventDefault();

		var arg1 = $('input[name=arg1]').val().replace(" ", "");
		var arg2 = $('input[name=arg2]').val().replace(" ", "");
		var op = $('select[name=op]').val();

		if (!isNaN(arg1) && !isNaN(arg2)) {
			result = queryServer(arg1, arg2, op);
		}
		else {
			console.log('We have a function!'); //TODO what now?
		}
	});
});

function queryServer(arg1, arg2, op) {
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
		})
		.fail(function(err) {
			console.log("Fail: " + JSON.stringify(err));
			showError('There was an error. :(\nMore info in browser error console.');
		});
}

function renderResult(arg1, arg2, op, result) {
	$("#results").append("<p>" 
		+ arg1 
		+ " " 
		+ op 
		+ " " 
		+ arg2 
		+ " = " 
		+ result 
		+"</p>");
}

function showError(error) {
	alert(error);
}