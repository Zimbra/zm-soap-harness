import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 60894 - Contact sorting case insensitive', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">aa</a>
					<a n="lastName">aa1</a>
					<a n="email">aa@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">za</a>
					<a n="lastName">zaa</a>
					<a n="email">za@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">B</a>
					<a n="lastName">B1</a>
					<a n="email">B@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" sortBy="nameAsc">
				<query>in:contacts</query>
			</SearchRequest>`, accountToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
