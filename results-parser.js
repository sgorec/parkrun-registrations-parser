var cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');
var path = require('path');

function getPageUrl(num) {
	return 'http://www.parkrun.ru/chelyabinsk/results/weeklyresults/?runSeqNumber=' + num;	
}

/**
 * Return Promise with jquery-like body
 */
function getPageContent(url) {
	console.log('Process: %s', url);

	return new Promise(function(res, rej) {
		request(url, function(err, resp, body) {
			if (err) {
				return rej(err);
			}

			if (resp.statusCode > 200) {
				return rej('Request status: ' + resp.statusCode);
			}

			res(cheerio.load(body));
		});
	});
}

function timeStringToSecs(timeString) {
	var timeParts = timeString.split(':');
	var secs = [3600, 60, 1].slice(-timeParts.length);

	return timeParts.reduce((prev, next, index) => {
		return prev + parseInt(next) * secs[index];
	}, 0);
}

function getArgs() {
	var rawArgs = process.argv;
	var args = rawArgs.filter(function(arg) {
		return /num=\d+/.test(arg);
	}).reduce(function(prev, next) {
		var arg = next.split('=');

		prev[arg[0]] = parseInt(arg[1]);

		return prev;
	}, {});

	return args;
}

function timeout() {
	return new Promise(function(res) {
		setTimeout(function () {
			res(Promise.resolve());
		}, 1000);
	});
}

var runNumber = getArgs().num || 1;
var outDir = path.join(__dirname, './out');
var fileName = path.join(outDir, 'run_results_' + runNumber + '.csv');

if (!fs.existsSync(outDir)){
	fs.mkdirSync(outDir);
}

fs.writeFileSync(fileName, [
	'run_number',
	'overal_pos',
	'name',
	'time',
	'group',
	'age_grade',
	'gender',
	'gender_pos',
	'runs',
	'comment',
	'profile_link'
].join(';') + '\n');

getPageContent(getPageUrl(runNumber)).then(function ($) {
	var trs = $('table#results > tbody tr');
	var rows = [];

	for (var i = 0; i < trs.length; i++) {
		var tds = $('td', trs[i]);
		var profile_link = $(tds[1]).find('a').attr('href');
		var row = [
			runNumber, // run_number
			parseInt($(tds[0]).text()), // overal_pos
			$(tds[1]).text(), // name
			timeStringToSecs($(tds[2]).text()), // time
			$(tds[3]).text(), // group
			parseFloat($(tds[4]).text()), // age_grade
			$(tds[5]).text(), // gender
			parseInt($(tds[6]).text()), // gender_pos
			parseInt($(tds[9]).text()), // runs
			$(tds[8]).text(), // comment,
			'http://www.parkrun.ru/chelyabinsk/results/weeklyresults/' + profile_link // profile_link
		]
		fs.appendFileSync(fileName, row.join(';') + '\n');
	}
}).catch((err) => {
	console.log(err.message);
});