//#####################################################################
//#                All rights reserved to davekolian                  #
//#####################################################################

require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');

const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.runtime');
stealth.enabledEvasions.delete('iframe.contentWindow');
puppeteer.use(stealth);

let new_chapters = [];
let record_ids = 0;

async function pageInterception(page, domain) {
	if (domain == 'warframe') {
		await page.setRequestInterception(true);

		page.on('request', (req) => {
			if (
				// req.resourceType() == 'stylesheet' ||
				req.resourceType() == 'font' ||
				req.resourceType() == 'image'
				// ||
				// req.resourceType() == 'script'
			) {
				req.abort();
			} else {
				req.continue();
			}
		});
	}
}

async function mainScrapers(objs) {
	let browser = await puppeteer.launch({ headless: false });
	let final = [];

	console.log(objs);

	for (let obj of objs) {
		let url = 'https://warframe.market/items/' + obj;
		let domain = '';
		let split = url.split('//')[1].split('.');
		if (split[0] == 'www') {
			domain = split[1];
		} else {
			domain = split[0];
		}

		console.log(domain);

		let page = await browser.newPage();
		let result = '';

		if (domain == 'warframe') {
			await pageInterception(page, domain);
			result = await getFromMarket(page, url);
		}

		await page.close();

		let id = result[0].id;
		let best_price = result[0].price;
		let min = 1000;
		let max = 0;
		let sum = 0;
		let nice_price = best_price;

		if (result.length > 1) {
			nice_price = result[1].price;
		}

		for (let i = 0; i < result.length; i++) {
			sum += result[i].price;

			if (result[i].price > max) {
				max = result[i].price;
			}
			if (result[i].price < min) {
				min = result[i].price;
			}
		}

		let avg = sum / result.length;
		row = {
			id: id,
			best_price: best_price,
			nice_price: nice_price,
			min: min,
			avg: avg,
			max: max,
		};
		final.push(row);
	}

	await browser.close();
	return final;
}

async function getFromMarket(page, url) {
	const local_chapters = [];
	const local_links = [];
	const buyButton = '.wtb';

	try {
		await page.goto(url, { timeout: 0 });

		await new Promise((r) => setTimeout(r, 10000));

		await page.click(buyButton);
		console.log('Clicked');
		id = 'abating_link';

		let tmp = await page.evaluate(() => {
			document.body.style.zoom = 0.5;
			window.scrollBy(0, window.innerHeight);
		});

		await new Promise((r) => setTimeout(r, 10000));

		console.log('Getting prices.');

		let prices = await page.evaluate((id) => {
			let x = document.getElementsByClassName('row');
			console.log(x.length);
			console.log(x);

			res = [];
			for (let i = 2; i < x.length - 3; i++) {
				let user = x[i].children[0].textContent;
				let status = x[i].children[1].textContent;
				let price = x[i].children[3].textContent;
				let rank = x[i].children[5].textContent[0];
				let row = {
					id: id,
					user: user,
					status: status,
					price: price,
					rank: rank,
				};
				if (status == 'Online in game') {
					res.push(row);
				}
			}

			return res;
		}, id);

		console.log(prices);

		// let arr = await page.evaluate((last_read) => {
		// 	console.log('here');
		// 	let x = document.getElementsByClassName('eph-num');
		// 	console.log(x);
		// 	let arr = [];
		// 	let top = Number(x[0].children[0].children[0].innerText.split(' ')[1]);

		// 	for (let i = 0; i < top - last_read; i++) {
		// 		let chap_no = x[i].children[0].children[0].innerText.split(' ')[1];
		// 		let date = x[i].children[0].children[1].innerText;
		// 		let link = x[i].children[0].href;
		// 		arr.push([chap_no, date, link]);
		// 	}

		// 	return arr;
		// }, last_read);

		// if (local_chapters.length > 0) {
		// 	new_document = {
		// 		record_id: record_ids,
		// 		url: url,
		// 		manga_name: name,
		// 		manga_chapters: local_chapters,
		// 		img_link_bg: img_link,
		// 		chapter_links: local_links,
		// 		last_read: last_read,
		// 	};
		// 	record_ids += 1;

		// 	console.log(new_document);
		// 	new_chapters.push(new_document);
		// }

		// await new Promise((r) => setTimeout(r, 10000));

		console.log('Done reading above');
		return prices;
	} catch (error) {
		console.log('Error reading this page');
		console.log(error);
	}
}

async function main() {
	// while (true) {
	record_ids = 0;
	console.log('Starting the process...');
	const data = ['abating_link'];
	let info = await mainScrapers(data);
	// await pushNewToDB(new_chapters);
	// new_chapters = [];

	console.log(info);

	// let sleep = 1000 * 60 * 60;
	// console.log('Sleep for an hour');
	// await new Promise((r) => setTimeout(r, sleep));
	// }
}

main();
