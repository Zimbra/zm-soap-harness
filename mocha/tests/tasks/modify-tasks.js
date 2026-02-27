import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Tasks > Modify Tasks', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null, account2AuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Helper to create a task and return its id
	async function createTask(subject) {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test task</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken, true
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		return res.CreateTaskResponse.invId;
	}

	// Tests
	it('Smoke | To modify the location and attendee of a task', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);
		const newLocation = `loc${common.getUniqueString()}`;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" loc="${newLocation}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Modified task</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyTaskResponse, 'ModifyTaskResponse should exist');
	});


	it('Functional | Send ModifyTaskRequest, without changing any fields', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Test task</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyTaskResponse, 'ModifyTaskResponse should exist');
	});


	it('Functional | Modifying the task twice', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);

		// First modification
		const modRes1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" priority="1"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>First modification</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes1.Fault, 'First modification should not be a Fault');

		// Second modification
		const modRes2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${modRes1.ModifyTaskResponse.invId || taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" priority="5"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Second modification</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes2.Fault, 'Second modification should not be a Fault');
	});


	it('Functional | Adding a non-existing attendee to the task while modifying it', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);
		const fakeEmail = `nonexistent${common.getUniqueString()}@example.com`;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${fakeEmail}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${fakeEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Non-existing attendee</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyTaskResponse, 'ModifyTaskResponse should exist');
	});


	it('Functional | Modify the task by adding new attendees', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Added attendee</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyTaskResponse, 'ModifyTaskResponse should exist');
	});


	it('Functional | Modify a task inviting multiple people in which address of one attendee is non-existing', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);
		const fakeEmail = `fake${common.getUniqueString()}@example.com`;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" method="REQUEST">
						<or a="${accountEmail}"/>
						<at a="${account2Email}" role="REQ" ptst="NE"/>
						<at a="${fakeEmail}" role="REQ" ptst="NE"/>
					</comp></inv>
					<e t="t" a="${account2Email}"/>
					<e t="t" a="${fakeEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Mixed attendees</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify servicePERMDENIED return code (acct2 attempts to modify a task owned by acct1)', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" priority="9"><or a="${account2Email}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>Unauthorized modification</content></mp>
				</m>
			</ModifyTaskRequest>`, account2AuthToken, true
		);
		assert.exists(modRes.Fault, 'Unauthorized modification should be a Fault');
	});


	it('Sanity | To modify a task by adding an attachment', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="multipart/mixed">
						<mp ct="text/plain"><content>Modified with attachment reference</content></mp>
					</mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyTaskResponse, 'ModifyTaskResponse should exist');
	});


	it('Sanity | Modify the priority of a task to high', async () => {
		const subject = `task${common.getUniqueString()}`;
		const taskId = await createTask(subject);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyTaskRequest xmlns="urn:zimbraMail" id="${taskId}" comp="0">
				<m>
					<inv><comp name="${subject}" priority="1"><or a="${accountEmail}"/></comp></inv>
					<su>${subject}</su>
					<mp ct="text/plain"><content>High priority</content></mp>
				</m>
			</ModifyTaskRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyTaskResponse, 'ModifyTaskResponse should exist');

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${modRes.ModifyTaskResponse.invId || taskId}"/>`,
			accountAuthToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
	});
});
