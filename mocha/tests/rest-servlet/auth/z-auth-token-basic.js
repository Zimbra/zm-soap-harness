import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Auth > zAuthToken', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token, account2Email, msgId;

	before(async function () {
		await main.before(this);
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

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);

		// Send a message
		const subject = 'subject' + common.getUniqueString();

		// SendMsgRequest
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const msg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		msgId = msg.id;
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
	it('Sanity | Use zAuthToken in the URL to view a file using REST', async () => {
		const restRes = await rest.makeRestRequest(null, {
			user: account1Email,
			zauthtoken: account1Token,
			id: msgId
		});

		// Verify response
		assert.equal(restRes.status, 200,
			'REST with zauthtoken should return 200');
	});


	it('Sanity | Verify nginx routes the REST request based on the zauthtoken value', async () => {
		const restRes = await rest.makeRestRequest(null, {
			user: account1Email,
			zauthtoken: account1Token,
			id: msgId
		});

		// Verify response
		assert.equal(restRes.status, 200,
			'REST with zauthtoken via generic server should return 200');
	});
});
