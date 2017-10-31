var cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');
var path = require('path');

var contentDescriptors = fs.readFileSync(path.join(__dirname, './content-descriptors.txt'))
	.toString()
	.split(/\n|\r/)
	.filter(function(string) { return !!string.trim(); });

var contentCheckers = contentDescriptors.map(function(descriptor) {
	return new RegExp(escapeRegExp(descriptor.trim()), 'i');
});

function grabData($) {
	var numberExtrator = /\D*(\d+)\D*/g;
	var data = [];

	$('table.wikitable > tbody > tr').each(function(_, tr) {
		var text = $(tr).text();            
		var isMatch = contentCheckers.some(function(checker) { return checker.test(text); });

		if (isMatch) {
			var eventName = $(tr).find('a').text();

			data.push({ 
				'Event': eventName,
				'Total': parseInt($(tr).find('td').eq(1).text()),
				'This week': parseInt($(tr).find('td').eq(2).text())
			});
		}
	});

	return data;
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function leadZero(num) {
	return (num < 10 ? '0' : '') + num;
}

request('http://wiki.parkrun.info/index.php/Registrations_this_Week', function(err, resp, body) {
	var $body = cheerio.load(body);
	var data = grabData($body);

	if (!data || !data.length) {
		return;
	}

	var outDir = path.join(__dirname, './out');

	if (!fs.existsSync(outDir)){
		fs.mkdirSync(outDir);
	}       

	var date = new Date();
	date = [
		date.getFullYear(),
		leadZero(date.getMonth() + 1),
		leadZero(date.getDate())
	].join('-');

	data.forEach(function(event) {
		var fileName = event['Event'].toLowerCase().replace(/\s{2,}/g, '').replace(/\s/g, '-') + '.csv';
		fileName = path.join(__dirname, './out', fileName);
		fs.appendFileSync(fileName, date + ' ' + event['Total'] + '\n');
	});
});