import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Tasks > Search Tasks', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const now = new Date();
	let Date1 = now.toISOString().slice(0, 10).replace(/-/g, '');
	const account1 = {};
	const globals = {
		name: 'globals',
		inbox: 'inbox',
		sent: 'sent',
		trash: 'trash',
		spam: 'junk',
		drafts: 'drafts',
		calendar: 'calendar',
		contacts: 'contacts',
		true: 'TRUE',
		false: 'FALSE',
		toString() { return this.name; }
	};
	const task1 = { subject: `task1_${common.getUniqueString()}` };
	const task2 = { subject: `task2_${common.getUniqueString()}` };
	const task3 = { subject: `task3_${common.getUniqueString()}`, content: `task3_${common.getUniqueString()}` };
	const task4 = { subject: `task4_${common.getUniqueString()}`, id: `task4_id` };

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

		// Get Tasks folder ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		const tasksFolderId = folderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Tasks').id;
		globals.tasks = 'Tasks';

		// Create Task 1 (attachment)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${tasksFolderId}">
					<inv>
						<comp name="${task1.subject}">
							<s d="20150101T100000"/>
							<e d="20150101T110000"/>
						</comp>
					</inv>
					<su>${task1.subject}</su>
					<mp ct="multipart/mixed">
						<mp ct="text/plain"><content>content1</content></mp>
						<mp ct="text/plain" filename="attach.txt"><content>attachment</content></mp>
					</mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Create Task 2 (recurring)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${tasksFolderId}">
					<inv>
						<comp name="${task2.subject}">
							<s d="20150101T100000"/>
							<e d="20150101T110000"/>
							<recur>
								<add><rule freq="DAI"><interval ival="1"/></rule></add>
							</recur>
						</comp>
					</inv>
					<su>${task2.subject}</su>
					<mp ct="text/plain"><content>content2</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Create Task 3 (with organizer)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${tasksFolderId}">
					<inv>
						<comp name="${task3.subject}">
							<s d="20150101T100000"/>
							<e d="20150101T110000"/>
							<or a="${accountEmail}"/>
						</comp>
					</inv>
					<su>${task3.subject}</su>
					<mp ct="text/plain"><content>${task3.content}</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Add inboxFolder to account1
		account1.folder = { task: { id: tasksFolderId } };

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
	it('Functional | Search for task with attachment', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>has:attachment</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
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
		const tasks = res.SearchResponse?.task;
		assert.exists(tasks, 'Tasks should exist in response');
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
	});


	it('Sanity |  (Bug: 53484)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Generate reminder time (2 minutes from now) in ICAL format
		const reminderDate = new Date(Date.now() + 2 * 60 * 1000);
		task4.reminder = reminderDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

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
		task4.id = task4_id;

		// SearchRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>${task4.subject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
	});
});
