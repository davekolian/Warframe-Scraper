const fetch = require('node-fetch');
const fs = require('fs');

//#####################################################################
//#                All rights reserved to davekolian                  #
//#####################################################################
//
// Everything on this file is using the Warframe Market API.
// Their docs are here: https://warframe.market/api_docs

const items_folder_dir = './items/';
const orders_folder_dir = './orders/';

// Utility functions
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
 * Check if the directory exists. If it doesn't create it.
 */
function checkCreateDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}


/**
 * Returns the name of each item that is stored on the Warframe Market API database.
 * @param {Boolean} is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} output_file_name  File name to save the results to.
 * @returns {Array}  Array of all the names of the items stored.
 */
async function getAllItemsUrlName(
	is_save_file = false,
	output_file_name = `${items_folder_dir}all_items_url_name.json`
) {
	const apiURL = 'https://api.warframe.market/v1/items';

	let res = await fetch(apiURL, { method: 'GET' });
	let obj = await res.json();
	let result = obj.payload.items.map((item) => item.url_name);

	if (is_save_file) {
		fs.writeFileSync(output_file_name, JSON.stringify(result));
	}
	return result;
}

/**
 * Get all the WTB (Want to Buy) orders from Warframe Market API for this specific item on a specific platform.
 * The orders must be visible and the player should NOT be offline.
 * @param {String} item  Name of the item to be searched.
 * @param {String} platform  Game platform from where the orders are made.
 * @param {Number} min_plat_limit Shows orders that have a platinum value of this or more.
 * @param {Boolean} is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} output_file_name  File name to save the results to.
 * @returns {Array}  Array of all the orders.
 */
async function getWTBItemOrders(
	item,
	platform,
	min_plat_limit,
	is_save_file = false,
	output_file_name = `${orders_folder_dir}${item}_orders`
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

	if (is_save_file) {
		fs.writeFileSync(`${output_file_name}.json`, JSON.stringify(result));
	}
	return result;
}

/**
 * Find the tags of the item parameter using the Warframe Market API and return the relevant keys from the JSON response.
 * @param {String} item  Name of the item to be searched.
 * @param {Boolean} is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} output_file_name  File name to save the results to.
 * @returns {Object}  Object which contains the details of the item searched.
 */
async function getItemTags(
	item,
	is_save_file = false,
	output_file_name = `${item}_tags`
) {
	const apiURL = `https://api.warframe.market/v1/items/${item}`;

	let res = await fetch(apiURL, { method: 'GET' });
	let obj = await res.json();

	let result = obj.payload.item.items_in_set.map((item) => {
		return {
			name: item.url_name,
			tags: item.tags,
			trading_tax: item.trading_tax,
			mod_max_rank: item.mod_max_rank,
			link: item.en.wiki_link,
		};
	})[0];

	if (is_save_file) {
		fs.writeFileSync(`${output_file_name}.json`, JSON.stringify(result));
	}
	return result;
}

/**
 * Gets every item's orders from Warframe Market API
 * @param {Boolean} is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} output_file_name  File name to save the results to.
 * @param {Boolean} is_sorted Boolean to decide to sort the results or not
 */
async function getAllItemsOrders(
	all_items_file_name = `${items_folder_dir}all_items_url_name.json`,
	is_save_file = false,
	output_file_name = `${orders_folder_dir}all_items_orders`,
	is_sorted = false,
	platform = 'pc',
	min_plat_limit = 15
) {
	let result = [];
	let all_items_market_data = readFromFileJSON(all_items_file_name);

	for (let name of all_items_market_data) {
		let orders = [];

		try {
			orders = await getWTBItemOrders(name, platform, min_plat_limit);
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
				name: name,
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
		output_file_name += '_sorted_dec';
		result = sorted_result;
	}

	if (is_save_file) {
		fs.writeFileSync(`${output_file_name}.json`, JSON.stringify(result));
	}
	// return result;
}

module.exports = {
	readFromFileJSON,
	checkCreateDir,
	getAllItemsUrlName,
	getItemTags,
	getWTBItemOrders,
	getAllItemsOrders,
};
