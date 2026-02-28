import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Fmt > Contact JSON', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">JsonFirst</a>
					<a n="lastName">JsonLast</a>
					<a n="email">json@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'Response should not be a Fault');
		contactRes.CreateContactResponse?.cn;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Using the REST servlet, get a contact using json format', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'contacts',
			fmt: 'json'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'JsonFirst', 'JSON response should contain first name');
		assert.include(res.body, 'JsonLast', 'JSON response should contain last name');
	});
});
