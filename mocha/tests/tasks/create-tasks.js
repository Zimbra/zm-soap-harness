import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > Create Tasks', function () {
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
	it('Smoke | To create a task with minimum attributes', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
		assert.exists(res.CreateTaskResponse.calItemId, 'Task should have calItemId');
		assert.exists(res.CreateTaskResponse.invId, 'Task should have invId');
	});


	it('Functional | To create a task specifying its priority', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" priority="1"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>High priority task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const taskId = res.CreateTaskResponse.invId;

		// GetTaskRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${taskId}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
	});


	it('Functional | To create a task specifying its status', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" status="INPR"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>In progress task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying its percentage completion', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" percentComplete="50"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>50% complete</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create an all day task', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" allDay="1"><s d="20240101"/><e d="20240101"/>
						<or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>All day task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task with location', async () => {
		const subject = `task${common.getUniqueString()}`;
		const location = `loc${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" loc="${location}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task with location</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying name', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Named task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying start time but no end time', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><s d="20240301T090000"/>
						<or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Start time only</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying end time but no start time', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><e d="20240301T170000"/>
						<or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>End time only</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying start time and end time', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<s d="20240301T090000"/><e d="20240301T170000"/>
						<or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Start and end time</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying organisers name', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}" d="Test User"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>With organiser</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task specifying an attendee', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task with attendee</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task with content', async () => {
		const subject = `task${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>${content}</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Sanity | To send a task to other user and check for the type of the invitation as task', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task invitation</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');

		// Search for the task in account2's inbox
		await new Promise(resolve => setTimeout(resolve, 2000));

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
	});


	it('Sanity | To create a recurring task which repeats every day with no end date', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<or a="${accountEmail}"/>
						<s d="20240301T090000"/>
						<recur><add><rule freq="DAI"><interval ival="1"/></rule></add></recur>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Recurring daily task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Sanity | To create a task with attachment', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task with attachment reference</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Sanity | To create a task with attachment (MIME attachment)', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="multipart/mixed">
						<mp ct="text/plain"><content>Task with MIME attachment</content></mp>
					</mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | To create a task starting and ending yesterday', async () => {
		const subject = `task${common.getUniqueString()}`;
		const yesterday = new Date(Date.now() - 86400000);
		const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g, '');

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<s d="${dateStr}T090000"/><e d="${dateStr}T170000"/>
						<or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Yesterday task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});


	it('Functional | If reminder is set past the reminder period, prompt', async () => {
		const subject = `task${common.getUniqueString()}`;

		// CreateTaskRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}">
						<or a="${accountEmail}"/>
						<alarm action="DISPLAY"><trigger><rel m="5" related="START" neg="1"/></trigger></alarm>
					</comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Task with reminder</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateTaskResponse, 'CreateTaskResponse should exist');
	});
});
