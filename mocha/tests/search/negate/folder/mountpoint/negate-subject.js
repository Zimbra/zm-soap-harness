import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';

describe('Search > Negate > Folder > Mountpoint > Negate Subject', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountAuthToken, accountAuthToken2;
	let accountEmail, accountEmail2;
	const account1 = {};
	const mountpointName = `mp_${common.getUniqueString()}`;
	let mountpointId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1.id = res1.CreateAccountResponse.account[0].id;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0

Test content
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="2" op="grant">
					<grant d="${accountEmail2}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);

		const resMP = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountpointName}" view="message" rid="2" owner="${accountEmail}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
		mountpointId = resMP.CreateMountpointResponse.link[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify a search for not subject - (text) in a mountpoint', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:${mountpointId} not subject:(simple)</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:${mountpointId} -subject:(simple)</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Verify a search for not subject - (text) in a remote folder', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:"${account1.id}:2" not subject:(simple)</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse, 'SearchResponse should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>inid:"${account1.id}:2" -subject:(simple)</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});
});
