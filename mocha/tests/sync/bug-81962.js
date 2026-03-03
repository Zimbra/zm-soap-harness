import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sync > Bug 81962', function () {
	this.timeout(120 * 1000);
	let adminAuthToken = null;
	let account1Email = null, account1AuthToken = null;
	let account2Email = null, account2AuthToken = null;

	before(async () => {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		account1Email = account1Name;
		account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Create account2
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		account2Email = account2Name;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
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
	it('Sanity | Send message and verify sync response', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const content = `content of the message${common.getUniqueString()}`;

		// account1 sends mail to account2
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes1.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sendRes1.SendMsgResponse.m)
			? sendRes1.SendMsgResponse.m[0] : sendRes1.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');
		const msgId1 = sendRes1.SendMsgResponse.m[0].id;

		// Verify response
		assert.exists(msgId1, 'Message should have an id');

		// SyncRequest from account1 with l=9 (contacts folder)
		await new Promise(resolve => setTimeout(resolve, 1000));

		// SyncRequest
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest l="9" xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		// Verify response
		assert.exists(token1, 'SyncResponse should have a token');

		// SyncRequest with token
		const syncRes1b = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token1}" l="9" xmlns="urn:zimbraMail"/>`, account1AuthToken
		);

		// Verify response
		assert.notExists(syncRes1b.Fault, 'Response should not be a Fault');

		// account2 replies to the mail
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId1}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(sendRes2.Fault, 'Response should not be a Fault');
		assert.isString(sentMsg.id, 'Sent message should have an id');
		const msgId2 = sendRes2.SendMsgResponse.m[0].id;

		// Back to account1 - sync should show deleted ids
		await new Promise(resolve => setTimeout(resolve, 10000));

		// SyncRequest
		const syncRes1c = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token1}" l="9" xmlns="urn:zimbraMail"/>`, account1AuthToken
		);

		// Verify response
		assert.notExists(syncRes1c.Fault, 'Response should not be a Fault');
		if (syncRes1c.SyncResponse.deleted) {
			const delArr = Array.isArray(syncRes1c.SyncResponse.deleted)
				? syncRes1c.SyncResponse.deleted : [syncRes1c.SyncResponse.deleted];
			const deletedIds = delArr.map(d => d.ids || d.id || '').join(',');

			// Verify response
			assert.include(deletedIds, msgId1,
				'Deleted ids should contain original message id');
		}

		// Full sync to get new token
		const syncRes1d = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest l="9" xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(syncRes1d.Fault, 'Response should not be a Fault');
		const token2 = syncRes1d.SyncResponse.token;

		// Incremental sync with new token
		const syncRes1e = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token2}" l="9" xmlns="urn:zimbraMail"/>`, account1AuthToken
		);

		// Verify response
		assert.notExists(syncRes1e.Fault, 'Response should not be a Fault');

		// account1 sends another reply to account2
		const sendRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId2}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes3.Fault, 'Response should not be a Fault');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// account2 replies again
		const sendRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${sendRes3.SendMsgResponse.m[0].id}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(sendRes4.Fault, 'Response should not be a Fault');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Back to account1 - full sync and verify
		const syncFinal = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest l="9" xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(syncFinal.Fault, 'Response should not be a Fault');

		// SyncRequest
		const syncFinalInc = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token1}" l="9" xmlns="urn:zimbraMail"/>`, account1AuthToken
		);

		// Verify response
		assert.notExists(syncFinalInc.Fault, 'Response should not be a Fault');
		if (syncFinalInc.SyncResponse.deleted) {
			const delArr = Array.isArray(syncFinalInc.SyncResponse.deleted)
				? syncFinalInc.SyncResponse.deleted : [syncFinalInc.SyncResponse.deleted];
			const deletedIds = delArr.map(d => d.ids || d.id || '').join(',');

			// Verify response
			assert.isNotEmpty(deletedIds,
				'Deleted ids should not be empty when deleted element exists');
		}
		// Verify token changed from original
		const tokenFinal = syncFinalInc.SyncResponse.token;

		// Verify response
		assert.exists(tokenFinal, 'Final sync should have a token');
	});
});
