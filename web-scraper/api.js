const fetch = require('node-fetch');
const fs = require('fs');

/**
 * Returns the name of each item that is stored on the Warframe Market database.
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
 * Get all the orders for this specific item on a specific platform.
 * @param {String} item  Name of the item to be searched.
 * @param {String} platform  Game platform from where the orders are made.
 * @param {Number} min_plat_limit Shows orders that have a platinum value of this or more.
 * @param {Object} saveFile  Save file settings.
 * @param {Boolean} saveFile.is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} saveFile.file_name  File name to save the results to.
 * @returns {Array}  Array of all the orders.
 */
async function getItemOrders(
	item,
	platform,
	min_plat_limit,
	saveFile = {
		is_save_file: false,
		file_name: 'all_items_url_name.json',
	}
) {
	const apiURL = `https://api.warframe.market/v1/items/${item}/orders`;

	let es = await fetch(apiURL, { method: 'GET' });
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
 * Find the tags of the item parameter using the Warframe API and return the relevant keys from the JSON response.
 * @param {String} item  Name of the item to be searched.
 * @param {Object} saveFile  Save file settings.
 * @param {Boolean} saveFile.is_save_file  Boolean to decide saving results to a file or not.
 * @param {String} saveFile.file_name  File name to save the results to.
 * @returns {Object}  Object which contains the details of the item searched.
 */
async function getItemTags(item) {
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
	});

	if (saveFile.is_save_file) {
		fs.writeFileSync(saveFile.file_name, JSON.stringify(result));
	}
	return result;
}

async function processData(sorted_items, file_name) {
	let result = [];

	// all_items = await getAllItemsUrlName();
	// console.log('Getting all items.');

	// for (let i = 0; i < all_items.length; i++) {
	// 	data = await getItemTags(all_items[i]);
	// 	if (data.length > 0) {
	// 		// console.log(data[0]);
	// 		sorted_items.push(data[0]);
	// 	}
	// }

	sorted_items = fs
		.readFileSync('all_items_market.json', { encoding: 'utf-8' })
		.toString();

	sorted_items = JSON.parse(sorted_items);

	for (let i = 0; i < sorted_items.length; i++) {
		let name = sorted_items[i];
		data = '';

		try {
			data = await getItemOrders(name, 'pc', 15);
		} catch (err) {
			try {
				data = await getItemOrders(name + '_set', 'pc', 15);
				name += '_set';
			} catch (err) {
				try {
					data = await getItemOrders(name + '_blueprint', 'pc', 15);
					name += '_blueprint';
				} catch (err) {}
			}
		}

		if (data.length > 0) {
			// console.log(`Getting item: ${name}`);

			let sum = 0;
			let avg = 0;
			let min = 100000;
			let max = 0;

			for (let j = 0; j < data.length; j++) {
				price = data[j].platinum;
				sum += price;
				if (price < min) min = price;
				if (price > max) max = price;
			}

			avg = sum / data.length;
			result.push({
				id: name,
				data: data,
				max: max,
				avg: avg,
				min: min,
			});
		}
	}

	jsonData = JSON.stringify(result);
	fs.writeFile(`${file_name}.json`, jsonData, function (err) {
		if (err) {
			console.log(err);
		}
	});
}

// processData([], 'all_items_orders');

async function test() {
	let data = fs.readFileSync('all_items_orders.json', { encoding: 'utf-8' });
	data = JSON.parse(data);

	data = data.sort(compare);
	// console.log(data);

	fs.writeFileSync('all_items_market_sorted_dec.json', JSON.stringify(data));
}
function compare(a, b) {
	if (a.max < b.max) {
		return 1;
	}
	if (a.max > b.max) {
		return -1;
	}
	return 0;
}
test();

module.exports = {
	getAllItemsUrlName,
	getItemTags,
	getItemOrders,
	processData,
};
