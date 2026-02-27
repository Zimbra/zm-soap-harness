import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Auth > Auth Combo', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token, account2Email, msgId, msgSubject;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);

		// Send a message
		msgSubject = 'subject' + common.getUniqueString();
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${msgSubject}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const msg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		msgId = msg.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Use the ba and co to view a file using REST (no cookie set)', async () => {
		const restRes = await soap.makeRestRequest(null, {
			user: account1Email,
			auth: 'ba,co',
			id: msgId
		});
		assert.equal(restRes.status, 401,
			'REST with ba,co auth and no cookie should return 401');
	});


	it('Sanity | Use the ba and co to view a file using REST (cookie is set)', async () => {
		const restRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			auth: 'ba,co',
			id: msgId
		});
		assert.equal(restRes.status, 200,
			'REST with ba,co auth and valid cookie should return 200');
		assert.include(restRes.body, account2Email, 'Response should contain To address');
		assert.include(restRes.body, msgSubject, 'Response should contain Subject');
	});
});
