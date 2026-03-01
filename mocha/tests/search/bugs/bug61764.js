import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug61764', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account 1 (the sharing account)
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account 2 (the grantee)
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Inject test message into account 1's inbox
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: shared folder test message
MIME-Version: 1.0

Content for shared folder search test with zimbraSSLExcludeCipherSuites</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Search in shared folder (Bug: 61764)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get account1's inbox folder id
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// Get account1's ID
		const res1a = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		const account1Id = res1a.GetInfoResponse?.id;

		// Grant access to inbox (id=2) for account2
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="2" op="grant">
					<grant d="${accountEmail2}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.FolderActionResponse, 'Response element should exist');

		// Account2: create mountpoint to account1's inbox
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);
		const mountName = `shared_${common.getUniqueString()}`;
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" view="message" rid="2" zid="${account1Id}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.CreateMountpointResponse, 'Response element should exist');

		// Account2: search in shared folder
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"${mountName}"</query>
			</SearchRequest>`, accountAuthToken2
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});
});
