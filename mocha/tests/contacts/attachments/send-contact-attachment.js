import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Attachments > Send Contact Attachment', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Sanity | Send a message with a contact attachment', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const contactEmail = `email${common.getUniqueString()}@example.com`;

		// Create contact as account2
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(createRes.Fault, 'Create contact should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Send message with contact attachment
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content ${common.getUniqueString()}</content>
					</mp>
					<attach>
						<cn id="${cn.id}"/>
					</attach>
				</m>
			</SendMsgRequest>`, account2Token
		);
		assert.notExists(sendRes.Fault, 'Send should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
	});
});
