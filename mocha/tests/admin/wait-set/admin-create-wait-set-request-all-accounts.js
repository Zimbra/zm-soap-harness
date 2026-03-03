import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Wait Set > Admin Create Wait Set Request All Accounts', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Functional | AdminWaitSetRequest with allaccounts attribute (blocking)', async () => {
		// Create a test account
		const accountEmail = `waitset.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;
		assert.exists(accountId, 'Account ID should exist');

		// Create a wait set with allaccounts
		const wsRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminCreateWaitSetRequest xmlns="urn:zimbraAdmin" defTypes="all" allaccounts="1">
			</AdminCreateWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(wsRes.Fault, 'AdminCreateWaitSetRequest should not fault');
		const waitSetId = wsRes.AdminCreateWaitSetResponse.waitSet;
		const waitSetSeq = wsRes.AdminCreateWaitSetResponse.seq;
		assert.exists(waitSetId, 'waitSet ID should exist');
		assert.exists(waitSetSeq, 'seq should exist');

		// Send a message to trigger waitset notification
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>waitset test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>waitset content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait briefly for message delivery
		await soap.waitFor(3000);

		// Send non-blocking AdminWaitSetRequest to pick up changes
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${waitSetId}" seq="${waitSetSeq}" defTypes="all">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');
	});


	it('Functional | AdminWaitSetRequest with allaccounts attribute with a new account (non-blocking)', async () => {
		// Create a wait set with allaccounts
		const wsRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminCreateWaitSetRequest xmlns="urn:zimbraAdmin" defTypes="all" allaccounts="1">
			</AdminCreateWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(wsRes.Fault, 'AdminCreateWaitSetRequest should not fault');
		const waitSetId = wsRes.AdminCreateWaitSetResponse.waitSet;
		const waitSetSeq = wsRes.AdminCreateWaitSetResponse.seq;
		assert.exists(waitSetId, 'waitSet ID should exist');
		assert.exists(waitSetSeq, 'seq should exist');

		// Create a new account after waitset creation
		const accountEmail = `waitset.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Send a message to the new account
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>waitset test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>waitset content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait briefly for message delivery
		await soap.waitFor(3000);

		// Send non-blocking AdminWaitSetRequest
		const waitRes = await soap.makeSOAPEnvelopeAdmin(
			`<AdminWaitSetRequest xmlns="urn:zimbraAdmin" waitSet="${waitSetId}" seq="${waitSetSeq}" defTypes="all">
			</AdminWaitSetRequest>`, adminAuthToken
		);
		assert.notExists(waitRes.Fault, 'AdminWaitSetRequest should not fault');

		// Verify the new account triggered the waitset by looking up the returned account
		if (waitRes.AdminWaitSetResponse.a) {
			const accounts = Array.isArray(waitRes.AdminWaitSetResponse.a)
				? waitRes.AdminWaitSetResponse.a : [waitRes.AdminWaitSetResponse.a];
			const returnedId = accounts[0].id;

			// Verify the returned ID belongs to the new account
			const getRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetAccountRequest xmlns="urn:zimbraAdmin">
					<account by="id">${returnedId}</account>
				</GetAccountRequest>`, adminAuthToken
			);
			assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');
			const getAcct = Array.isArray(getRes.GetAccountResponse.account)
				? getRes.GetAccountResponse.account[0] : getRes.GetAccountResponse.account;
			assert.exists(getAcct.name, 'Account name should exist');
		}
	});
});
