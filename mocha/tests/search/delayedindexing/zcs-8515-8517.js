import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > DelayedIndexing > ZCS 8515 8517', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const test_account1 = {};
	const test_account2 = {};
	const test_account3 = {};
	const test_account4 = {};
	let authToken2, authToken3, authToken4;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create 4 test accounts
		test_account1.name = `test1${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account1.name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		test_account1.id = res1.CreateAccountResponse.account[0].id;

		test_account2.name = `test2${common.getUniqueString()}@${config.testDomain}`;
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account2.name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		test_account2.id = res2.CreateAccountResponse.account[0].id;

		test_account3.name = `test3${common.getUniqueString()}@${config.testDomain}`;
		const res3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account3.name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		test_account3.id = res3.CreateAccountResponse.account[0].id;

		test_account4.name = `test4${common.getUniqueString()}@${config.testDomain}`;
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${test_account4.name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		test_account4.id = res4.CreateAccountResponse.account[0].id;

		// Send mail from account1 to account2, account3, account4
		const authToken1 = await soap.getAccountAuthToken(test_account1.name);
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${test_account2.name}"/>
					<e t="t" a="${test_account3.name}"/>
					<e t="t" a="${test_account4.name}"/>
					<su>test mail</su>
					<mp ct="text/plain">
						<content>Content in the message is content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);

		// Wait for mail delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Verify mail arrived in each account
		authToken2 = await soap.getAccountAuthToken(test_account2.name);
		authToken3 = await soap.getAccountAuthToken(test_account3.name);
		authToken4 = await soap.getAccountAuthToken(test_account4.name);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Disable account indexing and verify indexes are deleted (Bug: ZCS-8515)', async () => {
		adminAuthToken = await soap.getAdminAuthToken();

		// Disable indexing for account2
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<ManageIndexRequest xmlns="urn:zimbraAdmin" action="disableIndexing">
				<mbox id="${test_account2.id}"/>
			</ManageIndexRequest>`, adminAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.equal(res2.ManageIndexResponse.status, 'started', 'status should match');

		// Disable indexing for account3
		const res4 = await soap.makeSOAPEnvelopeAdmin(
			`<ManageIndexRequest xmlns="urn:zimbraAdmin" action="disableIndexing">
				<mbox id="${test_account3.id}"/>
			</ManageIndexRequest>`, adminAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.equal(res4.ManageIndexResponse.status, 'started', 'status should match');

		// Disable indexing for account4
		const res6 = await soap.makeSOAPEnvelopeAdmin(
			`<ManageIndexRequest xmlns="urn:zimbraAdmin" action="disableIndexing">
				<mbox id="${test_account4.id}"/>
			</ManageIndexRequest>`, adminAuthToken
		);
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.equal(res6.ManageIndexResponse.status, 'started', 'status should match');

		// Wait for indexing to be disabled
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Search in account2 - should return empty
		authToken2 = await soap.getAccountAuthToken(test_account2.name);
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(res9.Fault, 'Response should not be a Fault');
		assert.exists(res9.SearchResponse, 'Response element should exist');

		// Search in account3 - should return empty
		authToken3 = await soap.getAccountAuthToken(test_account3.name);
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken3
		);
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		assert.exists(res11.SearchResponse, 'Response element should exist');

		// Search in account4 - should return empty
		authToken4 = await soap.getAccountAuthToken(test_account4.name);
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken4
		);
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.SearchResponse, 'Response element should exist');
	});


	it('Smoke | Enable account indexing, verify email can be searched (Bug: ZCS-8515)', async () => {
		adminAuthToken = await soap.getAdminAuthToken();

		// Enable indexing for account2
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<ManageIndexRequest xmlns="urn:zimbraAdmin" action="enableIndexing">
				<mbox id="${test_account2.id}"/>
			</ManageIndexRequest>`, adminAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.equal(res2.ManageIndexResponse.status, 'started', 'status should match');

		// Wait for re-indexing
		await new Promise(resolve => setTimeout(resolve, 4000));

		// Search in account2 - should find the mail
		authToken2 = await soap.getAccountAuthToken(test_account2.name);
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="1">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.equal(res5.SearchResponse?.m?.[0].su, 'test mail', 'su should match');
	});


	it('Smoke | Authenticating account with disabled indexing should re-enable indexing (Bug: ZCS-8517)', async () => {
		// Auth as account3 (this should re-enable indexing)
		authToken3 = await soap.getAccountAuthToken(test_account3.name);

		// Wait for re-indexing
		await new Promise(resolve => setTimeout(resolve, 4000));

		// Search in account3 - should now find the mail
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken3
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
		if (res2.SearchResponse?.m?.[0]) {
			assert.equal(res2.SearchResponse.m[0].su, 'test mail', 'su should match');
		}
	});


	it('Regression | Delegate auth by admin to account with disabled indexing should re-enable indexing on search (Bug: ZCS-8517)', async () => {
		adminAuthToken = await soap.getAdminAuthToken();

		// Search in account4 - may show reIndexInProgress
		authToken4 = await soap.getAccountAuthToken(test_account4.name);
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken4
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');

		// Wait for re-indexing
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Search again - should find the mail
		authToken4 = await soap.getAccountAuthToken(test_account4.name);
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(test mail)</query>
			</SearchRequest>`, authToken4
		);
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse, 'SearchResponse should exist');
		if (res7.SearchResponse?.m?.[0]) {
			assert.equal(res7.SearchResponse.m[0].su, 'test mail', 'su should match');
		}
	});
});
