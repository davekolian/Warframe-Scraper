//#####################################################################
//#                All rights reserved to davekolian                  #
//#####################################################################
//
// This application is mainly used to get data from the Warframe Fandom website found here: https://warframe.fandom.com/wiki/WARFRAME_Wiki.
// The two key functions are: 1) to get all the names of the Syndicate items and their platinum values to see where to spend Standing one
//                            2) to get all the items from Varzia relics to see where to spend Aya on.
//
//
//
// Functions to get the items into files:
//           getAllSyndicateItems([], true);
// 			 getAllRelicDropNamesWiki([], { is_save_file: false, file_name: 'file_name.json' });
//
// Functions to read the files to get the orders of the specified relics:
// 			 getAllSyndicateItemOrders([], true);
// 			 getAllCurrentVarziaRelicDropsOrders('open_file_name.json', { is_save_file: false, file_name: 'file_name.json' });
//
// I would recommend to use the files functions once and read from it to get the orders so you don't have to overload the Wiki website.
//

const fs = require('fs');
const api = require('./api');
// All Puppeteer imports
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.runtime');
stealth.enabledEvasions.delete('iframe.contentWindow');
puppeteer.use(stealth);

const items_folder_dir = './items/';
const orders_folder_dir = './orders/';

const allSyndicateNamesList = [
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

/**
 * Function to sleep for 'seconds' number of seconds.
 * @param {Number} seconds  Time in seconds to sleep
 */
async function waitForSeconds(seconds) {
	await new Promise((r) => setTimeout(r, seconds * 1000));
}

/**
 * Function to make the page load faster by interrupting the loading of Images, JS Script, CSS and fonts.
 * @param {any} page Puppeteer Page
 */
async function pageInterception(page) {
	await page.setRequestInterception(true);

	page.on('request', (req) => {
		if (
			req.resourceType() == 'stylesheet' ||
			req.resourceType() == 'font' ||
			req.resourceType() == 'image' ||
			req.resourceType() == 'script'
		) {
			req.abort();
		} else {
			req.continue();
		}
	});
}

// Syndicate Page Stuff
/**
 * Function which opens the Syndicate Wiki page of each Syndicate to get it's items.
 * @param {Array} list_of_syndicates List of all syndicates as strings
 * @param {Boolean} save_each_file Boolean to save the results or not
 * @param {Boolean} headless_mode Boolean to decide to launch puppeeter in headless mode or not.
 */
async function getAllSyndicateItems(
	list_of_syndicates,
	save_each_file = false,
	headless_mode = true
) {
	let browser = await puppeteer.launch({ headless: headless_mode });

	for (let syndicate_name of list_of_syndicates) {
		let url = `https://warframe.fandom.com/wiki/${syndicate_name}`;
		let page = await browser.newPage();

		// console.log(syndicate_name);
		await getSyndicateItemsFromWiki(page, syndicate_name, url, save_each_file);

		await page.close();
	}

	await browser.close();
}

/**
 * Helper function which opens the specific page and scrapes the required data.
 * @param {any} page  Active Puppeeter Page which has opened the Wiki page.
 * @param {String} syndicate_name Name of the Syndicate to scrape.
 * @param {String} url  URL of the page to visit.
 * @param {Boolean} is_save_file  Boolean to decide saving results to a file or not.
 * @returns {Array}  List of all items as an Object from that syndicate and the item's standings.
 */
async function getSyndicateItemsFromWiki(
	page,
	syndicate_name,
	url,
	is_save_file = false
) {
	try {
		await pageInterception(page);
		await page.goto(url, { timeout: 0 });

		let items = await page.evaluate(() => {
			let tables = document.getElementsByClassName('mw-collapsible');
			let result = [];

			for (let table of tables) {
				try {
					let parentNode = table.getElementsByClassName('flex-container')[0];
					for (let child of parentNode.children) {
						let name = '';
						let standing = 0;
						let childNode = child.getElementsByTagName('span');
						try {
							name = childNode[1].textContent.replace('Blueprint', '');

							idx = name.indexOf('(');
							if (idx != -1) name = name.slice(0, idx);

							idx = name.indexOf('X');
							if (idx != -1) name = name.slice(0, idx);

							name = name.trim().replaceAll(' ', '_').toLowerCase();
						} catch (err) {}

						try {
							standing = childNode[0].textContent;
							standing = Number(standing.replace('\n', '').replace(',', ''));
						} catch (err) {}

						if (
							!isNaN(standing) &&
							standing != null &&
							standing > 0 &&
							name != ''
						) {
							result.push({ name: name, standing: standing });
						}
					}
				} catch (err) {}
			}

			return result;
		});

		if (is_save_file)
			fs.writeFileSync(
				`${items_folder_dir}/syndicate_items/${syndicate_name}_items.json`,
				JSON.stringify(items)
			);
		return items;
	} catch (error) {
		console.log('Error reading this page');
		console.log(error);
	}
}

// check this for the file name
/**
 * Gets all the item's orders from the specified syndicates.
 * @param {Array} syndicates Array of Strings of the names of the syndicates to get the item orders from.
 * @param {Boolean} is_save_file Boolean to save file or not.
 * @param {Boolean} is_sorted  Boolean to sort the prices in decreasing order
 */
async function getAllSyndicateItemOrders(
	syndicates,
	is_save_file = false,
	is_sorted = false
) {
	for (let syndicate_name of syndicates) {
		console.log(syndicate_name);
		let syndicate_file_name = `${items_folder_dir}syndicate_items/${syndicate_name}_items`;
		let syndicate_data = api.readFromFileJSON(`${syndicate_file_name}.json`);
		let result = [];
		let save_file_name = `${orders_folder_dir}syndicate_orders/${syndicate_name}_orders`;

		for (let syndicate_item of syndicate_data) {
			let name = syndicate_item.name;
			let orders = '';

			try {
				orders = await api.getWTBItemOrders(name, 'pc', 15);
			} catch (err) {
				try {
					orders = await api.getWTBItemOrders(name + '_set', 'pc', 15);
					name += '_set';
				} catch (err) {
					try {
						orders = await api.getWTBItemOrders(name + '_blueprint', 'pc', 15);
						name += '_blueprint';
					} catch (err) {}
				}
			}

			if (orders != '' && orders.length > 0) {
				let sum = 0;
				let avg = 0;
				let min = 100000;
				let max = 0;

				for (let order of orders) {
					price = order.platinum;
					sum += price;
					if (price < min) min = price;
					if (price > max) max = price;
				}
				avg = sum / orders.length;

				result.push({
					name: name,
					standing: syndicate_item.standing,
					orders: orders,
					max: max,
					avg: avg,
					min: min,
				});
			}
		}

		// Sorting the data in order from highest to lowest price (platinum)
		if (is_sorted) {
			let sorted_result = result.sort((a, b) => (a.max > b.max ? -1 : 1));
			save_file_name += '_sorted_dec';
			result = sorted_result;
		}

		if (is_save_file)
			fs.writeFileSync(`${save_file_name}.json`, JSON.stringify(result));
	}
}

// Relics Page Stuff
/**
 * Function which opens the page of each relic and the item's the relic drops.
 * @param {Array} list_of_relics_names List of all relic names as strings
 * @param {Boolean} is_save_file Boolean to save the results or not
 * @param {String} output_file_name File name to save the results
 * @param {Boolean} headless_mode Boolean to decide to launch puppeeter in headless mode or not.
 * @returns {Array} Array containing all the items dropped from all the relics.
 */
async function getAllRelicDropNamesWiki(
	list_of_relics_names,
	is_save_file = false,
	output_file_name = `${items_folder_dir}Varzia_relics_drop_names`,
	headless_mode = true
) {
	let browser = await puppeteer.launch({ headless: headless_mode });
	let result = [];

	for (let relic_name of list_of_relics_names) {
		let url = `https://warframe.fandom.com/wiki/${relic_name}`;
		let page = await browser.newPage();

		let arr = await readRelicPageWiki(page, relic_name, url);
		result = result.concat(arr);

		await page.close();
	}

	await browser.close();
	if (is_save_file) {
		fs.writeFileSync(`${output_file_name}.json`, JSON.stringify(result));
	}
	return result;
}

/**
 *
 * @param {any} page  Active Puppeeter Page which has opened the Wiki page.
 * @param {String} relic_name  Name of the relic of which to find the drops
 * @param {String} url  URL of the page to open
 * @returns {Array}  List of all drops and their ducat values from the relic
 */
async function readRelicPageWiki(page, relic_name, url) {
	try {
		await pageInterception(page);
		await page.goto(url, { timeout: 0 });

		let items = await page.evaluate(() => {
			let table = document.getElementsByClassName('wikitable')[0].children[0];
			let result = [];

			for (let row of table.children) {
				try {
					let name = row.children[0].textContent
						.toLowerCase()
						.replace('\n', '')
						.replace('blueprint', '')
						.trim()
						.replaceAll(' ', '_');

					let ducat_amt = Number(
						row.children[1].children[0].children[0].textContent
							.replace('\n', '')
							.trim()
					);

					if (name != 'forma') {
						result.push({ name: name, ducat_amt: ducat_amt });
					}
				} catch (err) {}
			}

			return result;
		});

		return items;
	} catch (error) {
		console.log('Error reading this page');
		console.log(error);
	}
}

/**
 * Function to get all Relics drop items' orders
 * @param {String} drops_file_name Name of the file which contains all the names and ducats.
 * @param {Boolean} is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} output_file_name  File name to save the results to.
 * @param {Boolean} is_sorted  Boolean to sort the files in decreasing order or not
 */
async function getAllRelicDropsOrders(
	drops_file_name = `${items_folder_dir}Varzia_relics_drop_names`,
	is_save_file = false,
	output_file_name = `${orders_folder_dir}Varzia_relics_drop_orders`,
	is_sorted = false
) {
	let drops = api.readFromFileJSON(`${drops_file_name}.json`);
	let result = [];
	for (let drop_name of drops) {
		let name = drop_name.name;
		let orders = [];

		// Some items are needed to get _set and _blueprint
		try {
			orders = await api.getWTBItemOrders(name, 'pc', 15);
			if (orders.length > 0) {
				let sum = 0;
				let avg = 0;
				let min = 100000;
				let max = 0;

				for (let order of orders) {
					price = order.platinum;
					sum += price;
					if (price < min) min = price;
					if (price > max) max = price;
				}
				avg = sum / orders.length;

				result.push({
					name: name,
					ducat_amt: drop_name.ducat_amt,
					orders: orders,
					max: max,
					avg: avg,
					min: min,
				});
			}
		} catch (err) {}

		try {
			let tmp_name = name + '_set';
			orders = await api.getWTBItemOrders(tmp_name, 'pc', 15);
			if (orders.length > 0) {
				let sum = 0;
				let avg = 0;
				let min = 100000;
				let max = 0;

				for (let order of orders) {
					price = order.platinum;
					sum += price;
					if (price < min) min = price;
					if (price > max) max = price;
				}
				avg = sum / orders.length;

				result.push({
					name: tmp_name,
					ducat_amt: drop_name.ducat_amt,
					orders: orders,
					max: max,
					avg: avg,
					min: min,
				});
			}
		} catch (err) {}

		try {
			let tmp_name = name + '_blueprint';
			orders = await api.getWTBItemOrders(tmp_name, 'pc', 15);
			if (orders.length > 0) {
				let sum = 0;
				let avg = 0;
				let min = 100000;
				let max = 0;

				for (let order of orders) {
					price = order.platinum;
					sum += price;
					if (price < min) min = price;
					if (price > max) max = price;
				}
				avg = sum / orders.length;

				result.push({
					name: tmp_name,
					ducat_amt: drop_name.ducat_amt,
					orders: orders,
					max: max,
					avg: avg,
					min: min,
				});
			}
		} catch (err) {}
	}

	if (is_sorted) {
		let sorted_result = result.sort((a, b) => (a.max > b.max ? -1 : 1));
		output_file_name += '_sorted_dec';
		result = sorted_result;
	}

	if (is_save_file)
		fs.writeFileSync(`${output_file_name}.json`, JSON.stringify(result));
	console.log('Done writing');
}

module.exports = {
	getAllSyndicateItems,
	getAllSyndicateItemOrders,
	getAllRelicDropNamesWiki,
	getAllRelicDropsOrders,
};
