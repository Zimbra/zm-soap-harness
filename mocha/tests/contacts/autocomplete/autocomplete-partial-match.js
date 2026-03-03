import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Autocomplete Partial Match', function () {
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

		const contacts = [
			{ first: 'PartialFirst', last: 'MatchLast', email: `partial1${common.getUniqueString()}@domain.com` },
			{ first: 'TestFirst', last: 'PartialLast', email: `partial2${common.getUniqueString()}@domain.com` },
			{ first: 'Another', last: 'Person', email: `partial3${common.getUniqueString()}@domain.com` }
		];

		for (const c of contacts) {
			await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">${c.first}</a>
						<a n="lastName">${c.last}</a>
						<a n="email">${c.email}</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
		}
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
	it('Smoke | AutoComplete with partial first name match', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Part</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});


	it('Sanity | AutoComplete with partial last name match', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Match</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});


	it('Sanity | AutoComplete with partial email match', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>partial</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});


	it('Sanity | AutoComplete with middle of name match', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>artial</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});


	it('Functional | AutoComplete partial match with limit', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" limit="1">
				<name>Partial</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
	});
});
