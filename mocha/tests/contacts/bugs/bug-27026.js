import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 27026', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountToken = await soap.getAccountAuthToken(accountEmail);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Import the csv to an account', async () => {
		const csvContent = 'First Name,Last Name,E-mail Address\nRôme,Carta,rome@test.com\nRené,Laprte,rene@test.com\nAdnan,Gökçen,adnan@test.com';

		// Import contacts
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountToken
		);

		// Verify import response
		assert.notExists(importRes.Fault, 'Import should not fault');

		// Search for imported contacts
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:contacts</query>
			</SearchRequest>`, accountToken
		);

		// Verify search results contain all 3 contacts with exact fileAsStr
		assert.notExists(searchRes.Fault, 'Search should not fault');
		assert.exists(searchRes.SearchResponse.cn, 'SearchResponse should have cn contacts');
		const contacts = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		const fileAsStrs = contacts.map(cn => cn.fileAsStr);
		assert.include(fileAsStrs, 'Carta, Rôme', 'Should find exact fileAsStr "Carta, Rôme"');
		assert.include(fileAsStrs, 'Laprte, René', 'Should find exact fileAsStr "Laprte, René"');
		assert.include(fileAsStrs, 'Gökçen, Adnan', 'Should find exact fileAsStr "Gökçen, Adnan"');
	});
});
