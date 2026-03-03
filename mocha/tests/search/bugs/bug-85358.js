import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug 85358', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	const messageSubject = `msg_${common.getUniqueString()}`;
	const messageContent = `content_${common.getUniqueString()}`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);
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
	it('Sanity | login as the test account (Bug: 85358)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get folder info
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		const rootFolderId = res2.GetFolderResponse.folder[0].id;
		const inboxFolder = res2.GetFolderResponse.folder[0].folder.find(f => f.name.toLowerCase() === 'inbox');
		const inboxFolderId = inboxFolder ? inboxFolder.id : '2';

		// Get account id
		const accRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		const accountId = accRes.GetInfoResponse.id;

		// Send message
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Grant access to account2
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${inboxFolderId}" op="grant">
					<grant d="${accountEmail2}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.FolderActionResponse.action, 'Response element should exist');

		// Create mountpoint as account2
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="sharedfold" view="message" rid="${inboxFolderId}" zid="${accountId}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		assert.notExists(res7.Fault, 'Response should not be a Fault');

		// Search in shared folder as account2
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
				<query>in:sharedfold</query>
			</SearchRequest>`, accountAuthToken2
		);
		assert.notExists(res8.Fault, 'Response should not be a Fault');
	});
});
