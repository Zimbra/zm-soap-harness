import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 48297', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | System failure - subject too long 1', async () => {
		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject MIME with long subject
		const filePath = path.join(config.projectRoot, 'mocha/data/bugs/48297/bug48297.txt');
		await soap.injectMime(authToken, filePath);

		// Search for the injected message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>Adrien B</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msg = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(msg, 'Message should be found');

		// Get the message and verify it exists
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msg.id}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
	});


	it('Sanity | System failure - subject too long 2', async () => {
		// Create a test account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Create an appointment with a very long subject
		const longSubject = 'Test subject.The Taj Mahal incorporates and expands on design traditions of Persian architecture and earlier Mughal architecture. The tomb is the central focus of the entire complex of the Taj Mahal. This large, white marble structure stands on a square plinth and consists of a symmetrical building with an iwan topped by a large dome and finial.';
		const appointmentName = `appt${common.getUniqueString()}`;
		const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
		const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${appointmentName}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountEmail}"/>
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${accountEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${longSubject}</su>
				</m>
			</CreateAppointmentRequest>`, authToken
		);
		assert.notExists(createApptRes.Fault, 'CreateAppointmentRequest should not fault');
		const apptId = createApptRes.CreateAppointmentResponse.apptId;

		// Get the appointment and verify it exists
		const getApptRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail" id="${apptId}"/>`, authToken
		);
		assert.notExists(getApptRes.Fault, 'GetAppointmentRequest should not fault');
		assert.exists(getApptRes.GetAppointmentResponse.appt, 'Appointment should exist');
	});


	it('Sanity | System failure - subject too long 3', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Get the Tasks folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0] : getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(rootFolder.folder)
			? rootFolder.folder
			: [rootFolder.folder];
		const taskFolder = folders.find(f => f && f.name === 'Tasks');
		assert.exists(taskFolder, 'Tasks folder should exist');
		const taskFolderId = taskFolder.id;

		// Create a task with a very long subject
		const longSubject = 'Test subject.The Taj Mahal incorporates and expands on design traditions of Persian architecture and earlier Mughal architecture. The tomb is the central focus of the entire complex of the Taj Mahal.';
		const appointmentName = `task${common.getUniqueString()}`;
		const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
		const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

		const createTaskRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${taskFolderId}">
					<inv method="REQUEST">
						<comp priority="1" percentComplete="50" status="INPR" allDay="0"
							name="${appointmentName}" loc="Location">
							<s d="${startTime}"/>
							<e d="${endTime}"/>
							<or a="${account1Email}"/>
							<at role="REQ" a="${account2Email}"/>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>Task content</content>
					</mp>
					<su>${longSubject}</su>
					<e a="${account2Email}" t="t"/>
				</m>
			</CreateTaskRequest>`, authToken
		);
		assert.notExists(createTaskRes.Fault, 'CreateTaskRequest should not fault');
		const taskId = createTaskRes.CreateTaskResponse.invId;

		// Get the task and verify it exists
		const getTaskRes = await soap.makeSOAPEnvelopeAccount(
			`<GetTaskRequest xmlns="urn:zimbraMail" id="${taskId}"/>`, authToken
		);
		assert.notExists(getTaskRes.Fault, 'GetTaskRequest should not fault');
		assert.exists(getTaskRes.GetTaskResponse, 'GetTaskResponse should exist');
	});
});
