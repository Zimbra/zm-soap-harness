import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Tasks > SendingTasks > SendTaskBasic', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null, account2AuthToken = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send a partially completed task from user1 to user2', async () => {
		const subject = `task${common.getUniqueString()}`;

		// Create a task with partial completion and send to account2
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" method="REQUEST"
						status="INPR" percentComplete="50" priority="5">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Partially completed task</content>
					</mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateTaskResponse, 'CreateTaskResponse should exist');
		assert.exists(createRes.CreateTaskResponse.calItemId, 'Task should have calItemId');

		// Wait for delivery and search in account2
		await new Promise(resolve => setTimeout(resolve, 2000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m
			: (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);

		// Verify response
		assert.isAbove(msgs.length, 0,
			'Task invitation should be in account2 inbox');
	});
});
