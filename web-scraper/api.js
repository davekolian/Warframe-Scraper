const fetch = require('node-fetch');
const fs = require('fs');

//#####################################################################
//#                All rights reserved to davekolian                  #
//#####################################################################
//
// Everything on this file is using the Warframe Market API.
// Their docs are here: https://warframe.market/api_docs

/**
 * Returns the name of each item that is stored on the Warframe Market API database.
 * @param {Object} saveFile  Save file settings.
 * @param {Boolean} saveFile.is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} saveFile.file_name  File name to save the results to.
 * @returns {Array}  Array of all the names of the items stored.
 */
async function getAllItemsUrlName(
	saveFile = {
		is_save_file: false,
		file_name: 'all_items_url_name.json',
	}
) {
	const apiURL = 'https://api.warframe.market/v1/items';

	let res = await fetch(apiURL, { method: 'GET' });
	let obj = await res.json();
	let result = obj.payload.items.map((item) => item.url_name);

	if (saveFile.is_save_file) {
		fs.writeFileSync(saveFile.file_name, JSON.stringify(result));
	}
	return result;
}

/**
 * Get all the WTB (Want to Buy) orders from Warframe Market API for this specific item on a specific platform.
 * The orders must be visible and the player should NOT be offline.
 * @param {String} item  Name of the item to be searched.
 * @param {String} platform  Game platform from where the orders are made.
 * @param {Number} min_plat_limit Shows orders that have a platinum value of this or more.
 * @param {Object} saveFile  Save file settings.
 * @param {Boolean} saveFile.is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} saveFile.file_name  File name to save the results to.
 * @returns {Array}  Array of all the orders.
 */
async function getWTBItemOrders(
	item,
	platform,
	min_plat_limit,
	saveFile = {
		is_save_file: false,
		file_name: `${item}_orders.json`,
	}
) {
	const apiURL = `https://api.warframe.market/v1/items/${item}/orders`;

	let res = await fetch(apiURL, { method: 'GET' });
	let obj = await res.json();

	let result = obj.payload.orders
		.filter(
			(item) =>
				item.order_type == 'buy' &&
				item.user.status != 'offline' &&
				item.visible == true &&
				item.platform == platform &&
				item.platinum >= min_plat_limit
		)
		.map((item) => {
			return {
				user: item.user.ingame_name,
				platinum: item.platinum,
				quantity: item.quantity,
				rank: item.mod_rank,
			};
		});

	if (saveFile.is_save_file) {
		fs.writeFileSync(saveFile.file_name, JSON.stringify(result));
	}
	return result;
}

/**
 * Find the tags of the item parameter using the Warframe Market API and return the relevant keys from the JSON response.
 * @param {String} item  Name of the item to be searched.
 * @param {Object} saveFile  Save file settings.
 * @param {Boolean} saveFile.is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} saveFile.file_name  File name to save the results to.
 * @returns {Object}  Object which contains the details of the item searched.
 */
async function getItemTags(
	item,
	saveFile = {
		is_save_file: false,
		file_name: `${item}_tags.json`,
	}
) {
	const apiURL = `https://api.warframe.market/v1/items/${item}`;

	let res = await fetch(apiURL, { method: 'GET' });
	let obj = await res.json();

	let result = obj.payload.item.items_in_set.map((item) => {
		return {
			id: item.url_name,
			tags: item.tags,
			trading_tax: item.trading_tax,
			mod_max_rank: item.mod_max_rank,
			link: item.en.wiki_link,
		};
	})[0];

	if (saveFile.is_save_file) {
		fs.writeFileSync(saveFile.file_name, JSON.stringify(result));
	}
	return result;
}

/**
 * Reads data from file and return it parsed by JSON.
 * @param {String} file_name  File name to read data from.
 * @returns  JSON parsed data obtained from the file.
 */
function readFromFileJSON(file_name) {
	let result = fs.readFileSync(file_name, { encoding: 'utf-8' });
	return JSON.parse(result);
}

/**
 * Gets every item's orders from Warframe Market API
 * @param {Object} saveFile  Save file settings.
 * @param {Boolean} saveFile.is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} saveFile.file_name  File name to save the results to.
 * @param {Boolean} isSorted Boolean to decide to sort the results or not
 */
async function getAllItemsOrders(
	saveFile = {
		is_save_file: false,
		file_name: `${item}_tags.json`,
	},
	isSorted = false
) {
	let result = [];
	let all_items_market_data = readFromFileJSON('all_items_market.json');

	for (let name of all_items_market_data) {
		let orders = '';

		try {
			orders = await getWTBItemOrders(name, 'pc', 15);
		} catch (err) {}

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
				id: name,
				orders: orders,
				max: max,
				avg: avg,
				min: min,
			});
		}
	}

	// Sorting the data in order from highest to lowest price (platinum)
	if (isSorted) {
		let sorted_result = result
			.sort((a, b) => (a.max > b.max ? -1 : 1))
			.reverse();
		saveFile.file_name = saveFile.file_name += '_sorted_dec';
		result = sorted_result;
	}

	if (saveFile.is_save_file) {
		fs.writeFileSync(`${saveFile.file_name}.json`, JSON.stringify(result));
	}
	// return result;
}

// getAllItemsOrders(
// 	{ is_save_file: true, file_name: 'all_items_orders' },
// 	(isSorted = true)
// );

module.exports = {
	getAllItemsUrlName,
	getItemTags,
	getWTBItemOrders,
	getAllItemsOrders,
	readFromFileJSON,
};

// Unit Testing
// const saveFile = { is_save_file: true, file_name: 'test.json' };
// getAllItemsUrlName({ is_save_file: true, file_name: 'test.json' });
// getItemTags('abating_link', { is_save_file: true, file_name: 'test2.json' });
// getWTBItemOrders('arcane_energize', 'pc', 15, { is_save_file: true, file_name: 'test3.json' });
