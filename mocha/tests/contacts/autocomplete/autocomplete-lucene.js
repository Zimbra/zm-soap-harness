import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > AutoComplete > AutoComplete Lucene', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
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
			{ first: 'Lucene', last: 'TestOne', email: `lucene1${common.getUniqueString()}@domain.com` },
			{ first: 'Test+Special', last: 'Chars', email: `lucene2${common.getUniqueString()}@domain.com` },
			{ first: 'Query', last: 'Parser', email: `lucene3${common.getUniqueString()}@domain.com` }
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | AutoCompleteRequest with Lucene special characters', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Lucene</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete with plus character', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Test+</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | AutoComplete with query word', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Query</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});
});
