import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Search Action Request ZCS 3441', function () {
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

		const folderName = `target_${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');

		// SearchActionRequest - move messages to new folder
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="${folderName}" />
			</SearchActionRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'SearchActionRequest should not fault');
	});


	it('Sanity | Verify SearchAction Request with move action for inbox folder with subject as query', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="Inbox" />
			</SearchActionRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'SearchActionRequest should not fault');
	});


	it('Sanity | Verify SearchAction Request with move action for new folder with query having multiple params', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const folderName = `multi_${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="${folderName}" />
			</SearchActionRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'SearchActionRequest should not fault');
	});


	it('Sanity | Verify SearchActionRequest for move to invalid folder', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="Invalid_folder" />
			</SearchActionRequest>`, accountAuthToken
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should fault for invalid folder');
	});


	it('Sanity | Verify SearchActionRequest for move to subfolders', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const subfolderName = `sub_${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${subfolderName}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');

		// Move to subfolder
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchActionRequest xmlns="urn:zimbraMail">
				<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject1})</query>
				</SearchRequest>
				<BulkAction op="move" l="/Inbox/${subfolderName}" />
			</SearchActionRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'SearchActionRequest should not fault');
	});
});
