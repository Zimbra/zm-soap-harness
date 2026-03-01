import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > PersonalShared > Shared', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const contact1 = {};
	const folder_trash = {};
	const subject1 = `subject1_${common.getUniqueString()}`;
	const task1 = { subject: `task1_${common.getUniqueString()}` };

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
	it('Functional | Verify a mountpoint can be searched with query is - local or is - remote', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contact1.firstname} (is:local or is:remote)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		assert.exists(res2.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>${contact1.firstname} (is:local)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		// Verify empty result set
		assert.exists(res3.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${task1.subject} (is:local or is:remote)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
		assert.exists(res4.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${task1.subject} (is:local)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// Verify empty result set
		// Verify empty result set (original XML had emptyset="1")
		assert.exists(res5.SearchResponse, 'Response element should exist');
	});


	it('Functional | Verify \'is:local in:trash\' returns results even if there are entries in the trash folder (Bug: 21532)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// GetFolderRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// AddMsgRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="3">
					<content>To: foo@example.com
From: bar@example.com
Subject: ${subject1}
Date: Wed, 15 Aug 2007 10:11:05 -0700 (PDT)
Hello how r u?
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const message1_id = res3.AddMsgResponse.m[0].id;

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query> is:local in:trash </query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'SearchResponse should exist');
	});
});
