//#####################################################################
//#                All rights reserved to davekolian                  #
//#####################################################################
//
//
//
//
// I should use the functions from api and api-wiki here

const fs = require('fs');
const api = require('./api');
const wikiScraper = require('./api-wiki');

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

const varzia_relics = [
	'Lith D6',
	'Meso H8',
	'Neo C5',
	'Neo K8',
	'Axi G13',
	'Axi N11',
];

async function main() {
	// Get Varzia relic drops
	// let varzia_drops = await wikiScraper.getAllRelicDropNamesWiki(
	// 	varzia_relics,
	// 	true
	// );

	// Get Varzia drops orders
	// await wikiScraper.getAllRelicDropsOrders(undefined, true, undefined, true);

	// Get Syndicate Items
	// Get ALL Syndicate Items
	// await wikiScraper.getAllSyndicateItems(
	// 	allSyndicateNamesList,
	// 	true,
	// 	undefined
	// );

	// Get Syndicate Items Orders - takes 839.607 seconds that is quite some time
	let custom_syndicate_list = [
		'Cavia',
		'Entrati',
		"Kahl's Garrison",
		'The Holdfasts',
	];
	// await wikiScraper.getAllSyndicateItemOrders(custom_syndicate_list, true, true);

	// Get All Warframe Market Items
	// await api.getAllItemsUrlName(true, undefined);

	// Get All Warframe Market Items Orders - ~10 minutes for 1300 items, way to slow
	await api.getAllItemsOrders(
		undefined,
		true,
		undefined,
		true,
		undefined,
		undefined
	);
}

main();
