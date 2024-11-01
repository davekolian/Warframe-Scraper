// const fetch = require('node-fetch');
// const HTMLParser = require('node-html-parser');

// async function wiki() {
// 	let url = 'https://warframe.fandom.com/api.php?';

// 	params = {
// 		action: 'parse',
// 		page: 'Entrati',
// 		format: 'json',
// 	};

// 	url += new URLSearchParams(params).toString();

// 	let res = await fetch(url);
// 	let obj = await res.json();
// 	let data = obj.parse.links.map((item) => item['*']);
// 	let idx = data.indexOf('Cedo');
// 	console.log(idx);

// 	// let html = HTMLParser.parse(data);

// 	// console.log(html);
// 	// console.log(data.slice(idx, data.length - 1));
// }

// wiki();

////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

//#####################################################################
//#                All rights reserved to davekolian                  #
//#####################################################################

require('dotenv').config();
const express = require('express');
var fs = require('fs');
const api = require('./api');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.runtime');
stealth.enabledEvasions.delete('iframe.contentWindow');
puppeteer.use(stealth);

let new_chapters = [];
let record_ids = 0;

async function mainScrapers(objs, func) {
	let browser = await puppeteer.launch({ headless: false });

	for (let obj of objs) {
		let url = `https://warframe.fandom.com/wiki/${obj}`;
		let page = await browser.newPage();

		await func(page, obj, url);

		await page.close();
	}

	await browser.close();
}

async function mainScrapers2(objs, func) {
	let browser = await puppeteer.launch({ headless: false });
	let result = [];

	for (let obj of objs) {
		let url = `https://warframe.fandom.com/wiki/${obj}`;
		let page = await browser.newPage();

		let arr = await func(page, obj, url);
		result = result.concat(arr);

		await page.close();
	}

	await browser.close();
	console.log(result);

	await readingSyndicateFilesOrders2(result, 'Varzia_relics.json');
}

async function getSyndicateItemsFromMarket(page, obj, url) {
	try {
		await page.goto(url, { timeout: 0 });

		console.log('Zooming out');
		let tmp = await page.evaluate(() => {
			document.body.style.zoom = 0.5;
			window.scrollBy(0, window.innerHeight);

			[...document.querySelectorAll('div')].map(
				(e) => (e.style.display = 'flow-root')
			);
		});
		console.log('Getting data');

		let items = await page.evaluate(() => {
			let tables = document.getElementsByClassName('mw-collapsible');
			let result = [];

			for (let i = 0; i < tables.length; i++) {
				try {
					let parentNode =
						tables[i].getElementsByClassName('flex-container')[0];
					for (let j = 0; j < parentNode.children.length; j++) {
						let name = '';
						let standing = '0';
						let childNode = parentNode.children[j].getElementsByTagName('span');
						try {
							name = childNode[1].textContent;

							name = name.replace(' Blueprint', '');
							idx = name.indexOf('(');
							if (idx != -1) {
								name = name.slice(0, idx);
							}
							idx = name.indexOf('X');
							if (idx != -1) {
								name = name.slice(0, idx);
							}
							name = name.trim();
						} catch (err) {}

						try {
							standing = childNode[0].textContent;
						} catch (err) {}

						standing = Number(standing.replace('\n', '').replace(',', ''));
						if (
							!(
								isNaN(standing) ||
								standing == null ||
								name == '' ||
								standing == 0
							)
						) {
							result.push([name, standing]);
						}
					}
				} catch (err) {}
			}

			return result;
		});

		console.log(items);
		jsonData = JSON.stringify(items);
		fs.writeFile(`./items/${obj}_items.json`, jsonData, function (err) {
			if (err) {
				console.log(err);
			}
		});

		// await new Promise((r) => setTimeout(r, 100000));
		console.log('Done reading above');
		// return prices;
	} catch (error) {
		console.log('Error reading this page');
		console.log(error);
	}
}

async function readingSyndicateFilesOrders(synd) {
	for (let obj of synd) {
		file_name = `./items/${obj}_items.json`;

		let data = fs.readFileSync(file_name, { encoding: 'utf-8' }).toString();
		console.log(obj);
		let result = [];
		data = JSON.parse(data);
		for (let d of data) {
			// console.log(d);
			let name = d[0].replaceAll(' ', '_').toLowerCase();
			orders = '';
			try {
				orders = await api.getItemOrders(name);
			} catch (err) {
				try {
					orders = await api.getItemOrders(name + '_set');
					name += '_set';
				} catch (err) {
					try {
						orders = await api.getItemOrders(name + '_blueprint');
						name += '_blueprint';
					} catch (err) {}
				}
			}

			if (orders != '' && orders.length > 0) {
				// console.log(sorted_items[i].id, data);

				let sum = 0;
				let avg = 0;
				let min = 100000;
				let max = 0;

				for (let j = 0; j < orders.length; j++) {
					price = orders[j].platinum;
					sum += price;
					if (price < min) {
						min = price;
					}
					if (price > max) {
						max = price;
					}
				}
				avg = sum / orders.length;

				result.push({
					id: name,
					standing: d[1],
					orders: orders,
					max: max,
					avg: avg,
					min: min,
				});
			}
		}
		result = JSON.stringify(result);
		fs.writeFile(`./orders/${obj}_orders.json`, result, function (err) {
			if (err) {
				console.log(err);
			}
		});
	}
}

async function readingSyndicateFilesOrders2(synd) {
	let result = [];
	for (let d of synd) {
		// console.log(d);
		let name = d.drop.replaceAll(' ', '_').toLowerCase();
		orders = '';

		try {
			orders = await api.getItemOrders(name);
		} catch (err) {
			try {
				orders = await api.getItemOrders(name + '_set');
				name += '_set';
			} catch (err) {
				try {
					orders = await api.getItemOrders(name + '_blueprint');
					name += '_blueprint';
				} catch (err) {}
			}
		}
		console.log(name);

		if (orders != '' && orders.length > 0) {
			let sum = 0;
			let avg = 0;
			let min = 100000;
			let max = 0;

			for (let j = 0; j < orders.length; j++) {
				price = orders[j].platinum;
				sum += price;
				if (price < min) {
					min = price;
				}
				if (price > max) {
					max = price;
				}
			}
			avg = sum / orders.length;

			result.push({
				id: name,
				ducat_amt: d.ducat_amt,
				orders: orders,
				max: max,
				avg: avg,
				min: min,
			});
		}
	}
	result = JSON.stringify(result);
	fs.writeFile(`Varzia_relics.json`, result, function (err) {
		if (err) {
			console.log(err);
		}
	});
	console.log('Done writing');
}

async function readRelicsWiki(page, obj, url) {
	try {
		await page.goto(url, { timeout: 0 });

		console.log('Zooming out');
		let tmp = await page.evaluate(() => {
			document.body.style.zoom = 0.5;
			window.scrollBy(0, window.innerHeight);
		});

		console.log('Getting data');

		let items = await page.evaluate(() => {
			let table = document.getElementsByClassName('wikitable')[0].children[0];
			let result = [];

			for (let i = 1; i < table.children.length; i++) {
				try {
					let row = table.children[i];
					let name = row.children[0].textContent
						.replace('\n', '')
						.replace('Blueprint', '')
						.trim();
					let ducat_amt = Number(
						row.children[1].children[0].children[0].textContent
							.replace('\n', '')
							.trim()
					);

					if (name != 'Forma') {
						result.push({ drop: name, ducat_amt: ducat_amt });
					}
				} catch (err) {}
			}

			return result;
		});

		return items;

		// await new Promise((r) => setTimeout(r, 100000));
		console.log('Done reading above');
	} catch (error) {
		console.log('Error reading this page');
		console.log(error);
	}
}

async function main() {
	console.log('Starting the process...');
	const syndicateNamesList = [
		'Steel Meridian',
		'Arbiters of Hexis',
		'Cephalon Suda',
		'The Perrin Sequence',
		'Red Veil',
		'New Loka',
		'Conclave',
		'Cephalon Simaris',
		'Ostron',
		'The Quills',
		'Solaris United',
		'Vox Solaris (Syndicate)',
		'Ventkids',
		'Entrati',
		'Necraloid',
		'The Holdfasts',
		'Cavia',
		"Kahl's Garrison",
		'Operational Supply',
		'Nightwave',
	];
	// await mainScrapers(syndicateNamesList, getSyndicateItemsFromMarket);
	let tmp = ['Cavia', 'Entrati', "Kahl's Garrison", 'The Holdfasts'];
	readingSyndicateFilesOrders(tmp);
	// let data = ['Lith D6', 'Meso H8', 'Neo C5', 'Neo K8', 'Axi G13', 'Axi N11'];
	// await mainScrapers2(data, readRelicsWiki);
}

main();
