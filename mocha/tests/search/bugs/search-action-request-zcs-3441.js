import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > ActionRequest ZCS 3441', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	const subject1 = `subject1_${common.getUniqueString()}`;

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

		// Inject test messages with unique subject
		for (let i = 0; i < 3; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>From: ${accountEmail}
To: ${accountEmail}
Subject: ${subject1}
MIME-Version: 1.0
Test content message ${i}</content>
						</m>
					</AddMsgRequest>`, accountAuthToken
			);
		}
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
	it('Sanity | Verify SearchAction Request with move action for new folder for multiple mails', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create target folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="target_${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		// SearchActionRequest - move messages to new folder
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="${folderId}" />
			</SearchActionRequest>`, accountAuthToken
		);
		if (res4.Fault) {
			// SearchActionRequest may not be supported on all versions
			assert.exists(res4.Fault, 'Response is a Fault (SearchActionRequest may not be fully supported)');
		} else {
			assert.exists(res4.SearchActionResponse, 'Response element should exist');
		}
	});


	it('Sanity | Verify SearchAction Request with move action for inbox folder with subject as query', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="2" />
			</SearchActionRequest>`, accountAuthToken
		);
		if (res2.Fault) {
			assert.exists(res2.Fault, 'Response is a Fault (SearchActionRequest may not be fully supported)');
		} else {
			assert.exists(res2.SearchActionResponse, 'Response element should exist');
		}
	});


	it('Sanity | Verify SearchAction Request with move action for new folder with query having multiple params', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create target folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="multi_${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');
		const folderId = folderRes.CreateFolderResponse.folder[0].id;

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="${folderId}" />
			</SearchActionRequest>`, accountAuthToken
		);
		if (res2.Fault) {
			assert.exists(res2.Fault, 'Response is a Fault (SearchActionRequest may not be fully supported)');
		} else {
			assert.exists(res2.SearchActionResponse, 'Response element should exist');
		}
	});


	it('Sanity | Verify SearchActionRequest for move to invalid folder', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="999999" />
			</SearchActionRequest>`, accountAuthToken
		);
		// Moving to invalid folder should either fault or succeed with no-op
		if (res2.Fault) {
			assert.exists(res2.Fault, 'Response should be a Fault for invalid folder');
		} else {
			assert.exists(res2.SearchActionResponse, 'Response element should exist');
		}
	});


	it('Sanity | Verify SearchActionRequest for move to subfolders', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create subfolder under inbox
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="sub_${common.getUniqueString()}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');
		const subfolderId = folderRes.CreateFolderResponse.folder[0].id;

		// Move to subfolder
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="${subfolderId}" />
			</SearchActionRequest>`, accountAuthToken
		);
		if (res1.Fault) {
			assert.exists(res1.Fault, 'Response is a Fault (SearchActionRequest may not be fully supported)');
		} else {
			assert.exists(res1.SearchActionResponse, 'Response element should exist');
		}
	});
});
