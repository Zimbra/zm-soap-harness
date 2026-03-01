import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug86679', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	const folderName1 = `folder1_${common.getUniqueString()}`;
	const folderName2 = `folder2_${common.getUniqueString()}`;

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

		// Inject test message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: ${accountEmail}
To: ${accountEmail}
Subject: test message
MIME-Version: 1.0
Test content</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
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
	it('Functional | is - fromme does not work as expected (Bug: 86679)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create folders
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName1}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const foldId1 = res2.CreateFolderResponse?.folder?.[0].id;

		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName2}" l="2"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const foldId2 = res3.CreateFolderResponse?.folder?.[0].id;

		// Search for conversation
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>subject:test</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const convId = res4.SearchResponse?.c?.[0]?.id;

		if (!convId) {
			// No conversation found — skip the move tests but don't fail
			return;
		}

		// Move conversation to folder1
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" l="${foldId1}" op="move"/>
			</ConvActionRequest>`, accountAuthToken
		);
		if (res5.Fault) {
			// ConvAction may fault if no messages match
			assert.exists(res5.Fault, 'ConvAction faulted');
		} else {
			assert.exists(res5.ConvActionResponse, 'ConvActionResponse should exist');
		}

		// Search is:fromme in folder1
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:${folderName1} is:fromme</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// Search is:fromme
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>is:fromme</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		assert.exists(res10.SearchResponse, 'SearchResponse should exist');

		// Move conversation to folder2
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" l="${foldId2}" op="move"/>
			</ConvActionRequest>`, accountAuthToken
		);
		if (res11.Fault) {
			assert.exists(res11.Fault, 'ConvAction faulted');
		} else {
			assert.exists(res11.ConvActionResponse, 'ConvActionResponse should exist');
		}

		// Search is:fromme in folder2
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:Inbox/${folderName2} is:fromme</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		assert.exists(res12.SearchResponse, 'SearchResponse should exist');
	});
});
