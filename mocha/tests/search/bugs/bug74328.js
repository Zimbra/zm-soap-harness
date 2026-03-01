import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug74328', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Search in folder with query - under - bugzilla Dave Comfort (Bug: 74328)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get root folder id
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');

		// Create folder under root
		const folderName = `bugzilla_${common.getUniqueString()}`;
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const folderId = res2.CreateFolderResponse?.folder?.[0]?.id;

		// Add message to the folder with "Dave Comfort" content
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<content>To: ${accountEmail}
From: sender@example.com
Subject: message
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

Dave Comfort</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search under the folder
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>under:${folderName} "Dave Comfort"</query>
			</SearchRequest>`, accountAuthToken
		);

		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');
		assert.equal(res4.SearchResponse?.m?.[0]?.su, 'message', 'su should match');
	});
});
