import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Tasks > Tasks', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const Date1 = { name: `Date1_${common.getUniqueString()}`, subject: `Date1_${common.getUniqueString()}`, from: accountEmail, content: `Date1_${common.getUniqueString()}`, value: `Date1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `Date1_id`, toString() { return this.name; } };
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const globals = { name: 'globals', inbox: 'inbox', sent: 'sent', trash: 'trash', spam: 'junk', drafts: 'drafts', calendar: 'calendar', contacts: 'contacts', true: 'TRUE', false: 'FALSE', toString() { return this.name; } };
	const task1 = { name: `task1_${common.getUniqueString()}`, subject: `task1_${common.getUniqueString()}`, from: accountEmail, content: `task1_${common.getUniqueString()}`, value: `task1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `task1_id`, toString() { return this.name; } };
	const task2 = { name: `task2_${common.getUniqueString()}`, subject: `task2_${common.getUniqueString()}`, from: accountEmail, content: `task2_${common.getUniqueString()}`, value: `task2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `task2_id`, toString() { return this.name; } };
	const task3 = { name: `task3_${common.getUniqueString()}`, subject: `task3_${common.getUniqueString()}`, from: accountEmail, content: `task3_${common.getUniqueString()}`, value: `task3_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `task3_id`, toString() { return this.name; } };
	const task4 = { name: `task4_${common.getUniqueString()}`, subject: `task4_${common.getUniqueString()}`, from: accountEmail, content: `task4_${common.getUniqueString()}`, value: `task4_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `task4_id`, toString() { return this.name; } };

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
	it('Functional | Search for task with attachment', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>has:attachment</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search for a task by subject', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>${task2.subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search for task by content', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>${task3.content}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search in task folder and check whether all tasks are returned', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>in:${globals.tasks}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search for a task with attachment and check for the attachment flag (Bug: 15005)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>${task1.subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.task[0].f, 'a!', 'f should match');
	});


	it('Functional | Search for a recurring task and check for the recurrence flag (Bug: 15062)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>${task2.subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.equal(res.SearchResponse?.task[0].recur, '1', 'recur should match');
	});


	it('Functional | To verify that organizer of task is returned in the SearchResponse (Bug: 15981)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>${task3.subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity |  (Bug: 53484)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateTaskRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
			<m l="${account1.folder.task.id}">
			<inv>
			<comp allDay="1" name="${task4.subject}">
			<s d="${Date1}"/>
			<e d="${Date1}"/>
			<alarm action="DISPLAY">
			<trigger>
			  <abs d="${task4.reminder}"/>
			</trigger>
			<desc>Reminder 1</desc>
			 <repeat count="2" m="10"/>
			 </alarm>
			</comp>
			</inv>
			<su>${task4.subject}</su>
			</m>
			        </CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const task4_id = res2.CreateTaskResponse.invId;

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
			<query>${task4.subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist', 'name should match');
		assert.exists(res3.SearchResponse, 'SearchResponse should exist', 'd should match');
	});
});
