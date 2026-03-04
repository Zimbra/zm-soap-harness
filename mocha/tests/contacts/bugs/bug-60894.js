import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 60894', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
	it('Sanity | Contact sorting is not case sensitive', async () => {
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">aa</a>
					<a n="lastName">aa1</a>
					<a n="email">aa@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes1.Fault, 'Create contact 1 should not fault');
		const cn1 = Array.isArray(createRes1.CreateContactResponse.cn)
			? createRes1.CreateContactResponse.cn[0] : createRes1.CreateContactResponse.cn;
		assert.exists(cn1.id, 'Contact 1 id should exist');

		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">za</a>
					<a n="lastName">zaa</a>
					<a n="email">za@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes2.Fault, 'Create contact 2 should not fault');
		const cn2 = Array.isArray(createRes2.CreateContactResponse.cn)
			? createRes2.CreateContactResponse.cn[0] : createRes2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Contact 2 id should exist');

		const createRes3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">B</a>
					<a n="lastName">B1</a>
					<a n="email">B@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes3.Fault, 'Create contact 3 should not fault');
		const cn3 = Array.isArray(createRes3.CreateContactResponse.cn)
			? createRes3.CreateContactResponse.cn[0] : createRes3.CreateContactResponse.cn;
		assert.exists(cn3.id, 'Contact 3 id should exist');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" sortBy="nameAsc">
				<query>in:contacts</query>
			</SearchRequest>`, accountToken
		);

		// Verify sorted results
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		const contacts = Array.isArray(searchRes.SearchResponse.cn)
			? searchRes.SearchResponse.cn : [searchRes.SearchResponse.cn];
		assert.isAtLeast(contacts.length, 3, 'Should have at least 3 contacts');
		const getLastName = (cn) => {
			const attrs = cn._attrs || {};
			return attrs.lastName || '';
		};
		assert.equal(getLastName(contacts[0]), 'aa1', 'First contact lastName should be aa1');
		assert.equal(getLastName(contacts[1]), 'B1', 'Second contact lastName should be B1');
		assert.equal(getLastName(contacts[2]), 'zaa', 'Third contact lastName should be zaa');
	});
});
