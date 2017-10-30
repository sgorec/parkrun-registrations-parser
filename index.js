var cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');
var path = require('path');

console.log('>> Load content descriptors.');

var contentDescriptors = fs.readFileSync(path.join(__dirname, './content-descriptors.txt'))
	.toString()
	.split(/\n|\r/)
	.filter(function(string) { return !!string.trim(); });

console.log('<< Loaded %s descriptors.', contentDescriptors.length);

var contentCheckers = contentDescriptors.map(function(descriptor) {
	var regex = new RegExp(escapeRegExp(descriptor.trim()), 'i');
	console.log(`-- Create content descriptor checker "${regex.source}".`);
	return regex;
});

function grabData($) {
	var numberExtrator = /\D*(\d+)\D*/g;
	var data = [];

	console.log('>> Start grab data from html content.');

	$('table.wikitable > tbody > tr').each(function(_, tr) {
		var text = $(tr).text();            
		var isMatch = contentCheckers.some((checker) => checker.test(text));

		if (isMatch) {
			console.log('-- Match content descriptor "%s".', text);

			data.push({ 
				'Event': $(tr).find('a').text(),
				'Total': parseInt($(tr).find('td').eq(1).text()),
				'This week': parseInt($(tr).find('td').eq(2).text())
			});
		}
	});

	console.log('<< End grab data from html content.');

	return data;
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

console.log('>> Load html content.');

request('http://wiki.parkrun.info/index.php/Registrations_this_Week', function(err, resp, body) {
	console.log('<< Loaded html content.');
	
	var $body = cheerio.load(body);
	var data = grabData($body);

	console.log('>> Save data to files.');

	if (!data || !data.length) {
		console.log('<< Nothing to save.');
		return;
	}

		var outDir = path.join(__dirname, './out');

	if (!fs.existsSync(outDir)){
		fs.mkdirSync(outDir);
	}       

	var date = new Date();
	date = [
		date.getFullYear(),
		date.getMonth() < 10 ? '0' + date.getMonth() : date.getMonth(),
		date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
	].join('-');

	data.forEach(function(event) {
		var fileName = event['Event'].toLowerCase().replace(/\s{2,}/g, '').replace(/\s/g, '-') + '.csv';
		fileName = path.join(__dirname, './out', fileName);
		fs.appendFileSync(fileName, date + ' ' + event['Total'] + '\n');
	});

	console.log('<< Saved data to %s files.', data.length);
});