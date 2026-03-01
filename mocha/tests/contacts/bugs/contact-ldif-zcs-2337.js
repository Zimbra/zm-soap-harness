import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Bugs > ZCS-2337 - Contact LDIF export', function () {
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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create contact and export as CSV', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="company">TestCompany</a>
					<a n="homePhone">1234567890</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(exportRes.Fault, 'Export should not be a Fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Sanity | Create multiple contacts and export', async () => {
		for (let i = 0; i < 3; i++) {

			// Create a contact
			await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">LdifFirst${i}${common.getUniqueString()}</a>
						<a n="lastName">LdifLast${i}${common.getUniqueString()}</a>
						<a n="email">ldif${i}${common.getUniqueString()}@domain.com</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
		}

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(exportRes.Fault, 'Export should not be a Fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});


	it('Sanity | Create contact with special characters and export', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Spécial${common.getUniqueString()}</a>
					<a n="lastName">Château${common.getUniqueString()}</a>
					<a n="email">special${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Export contacts
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);

		// Verify response
		assert.notExists(exportRes.Fault, 'Export should not be a Fault');
		assert.exists(exportRes.ExportContactsResponse, 'ExportContactsResponse should exist');
	});
});
