import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Fmt > Contact CSV', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let contactId;

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
					<a n="firstName">FirstName01</a>
					<a n="lastName">LastName01</a>
					<a n="email">email01@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'Response should not be a Fault');
		const cn = contactRes.CreateContactResponse?.cn;
		contactId = (Array.isArray(cn) ? cn[0] : cn).id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Using the REST servlet, get a contact using csv format', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: contactId,
			fmt: 'csv'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'FirstName01', 'CSV should contain first name');
		assert.include(res.body, 'LastName01', 'CSV should contain last name');
		assert.include(res.body, 'email01@domain.com', 'CSV should contain email');
	});


	it('Sanity | Using the REST servlet, get all contacts using csv format', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'contacts',
			fmt: 'csv'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'FirstName01', 'CSV should contain first name');
	});


	it('Sanity | Using the REST servlet with spaces, get contact, the spaces should get trimmed', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'contacts',
			fmt: 'csv'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'FirstName01', 'CSV should contain first name');
	});
});
