const cheerio = require('cheerio');
const request = require('request-promise');
const fs = require('fs');
const path = require('path');

const options = {
    uri: 'http://wiki.parkrun.info/index.php/Registrations_this_Week',
    transform: (body) => cheerio.load(body)
};

console.log(`>> Load content descriptors.`);

let contentDescriptors = fs.readFileSync(path.join(__dirname, './content-descriptors.txt')).toString().split(/\n|\r/);

console.log(`<< Loaded ${contentDescriptors.length} descriptors.`);

let contentCheckers = contentDescriptors.map((descriptor) => {
	let regex = new RegExp(escapeRegExp(descriptor.trim()), 'i');
	console.log(`-- Create content descriptor checker "${regex.source}".`);
	return regex;
});

function grabData($) {
	return new Promise((res, rej) => {
		const numberExtrator = /\D*(\d+)\D*/g;
		let data = [];

		console.log(`>> Start grab data from html content.`);

		$('table.wikitable > tbody > tr').each((i, tr) => {			
			let text = $(tr).text();			
			let isMatch = contentCheckers.some((checker) => checker.test(text));

			if (isMatch) {
				console.log(`-- Match content descriptor "${text}".`);

				data.push({ 
					'Event': $(tr).find('a').text(),
					'Total': parseInt($(tr).find('td').eq(1).text()),
					'This week': parseInt($(tr).find('td').eq(2).text())
				});
			}
		});

		console.log(`<< End grab data from html content.`);

		res(data);
	});
	
}

function escapeRegExp(text) {
  return text; //.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


console.log(`>> Load html content.`);

request(options)
    .then(function ($) {
    	console.log(`<< Loaded html content.`);
    	return grabData($);        
    })
    .then((data) => {
    	console.log(`>> Save data to files.`);

    	if (!data || !data.length) {
    		console.log(`<< Nothing to save.`);
    		return;
    	}

    	let outDir = path.join(__dirname, './out');

		if (!fs.existsSync(outDir)){
		    fs.mkdirSync(outDir);
		}    	

    	let date = new Date();
    	date = [
    		date.getFullYear(),
    		date.getMonth() < 10 ? '0' + date.getMonth() : date.getMonth(),
    		date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
    	].join('-');

    	data.forEach((event) => {
    		let fileName = event['Event'].toLowerCase().replace(/\s{2,}/g, '').replace(/\s/g, '-') + '.csv';
    		fileName = path.join(__dirname, './out', fileName);
    		fs.appendFileSync(fileName, date + ' ' + event['Total'] + '\n');
    	});

    	console.log(`<< Saved data to ${data.length} files.`);
    })
    .catch(function (err) {
        console.error(err);
        process.exit(1);
    });