import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > DataSource > DataSource_modify', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `datasource.${uid}a@${config.testDomain}`;
		account2Name = `datasource.${uid}b@${config.testDomain}`;

		for (const n of [account1Name, account2Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${n}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Modify name of a pop3 account to a valid value', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Regression | Modify name of a pop3 account to invalid values(blank, space, negative, largenumber, spchar, zero)', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Modify a pop3 account such that the mails are removed from the server', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Functional | Modify the folder of a pop3 account', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Modify zimbraDataSourceEmailAddress of a pop3 account to match zimbraDataSourceEmailAddress value for existing pop3 d...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
