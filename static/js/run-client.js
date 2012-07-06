function initialize() {
	$.getJSON('/runs', function(runs) {
		d3.select('#runs')
			.data(runs)
			.enter().append('p')
			.text(function(d) { return d.date; });
	});
}