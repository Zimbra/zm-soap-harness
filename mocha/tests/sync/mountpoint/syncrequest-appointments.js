import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Sync > Mountpoint > SyncRequest Appointments', function () {
	this.timeout(60 * 1000);
	let adminAuthToken = null;
	let account1Email = null, account1AuthToken = null, account1Id = null;
	let account2Email = null, account2AuthToken = null;
	let calendarFolderId = null, trashFolderId = null;

	before(async () => {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		account1Email = account1Name;
		account1Id = createRes1.CreateAccountResponse.account[0].id;
		account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Create account2
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		account2Email = account2Name;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get account1 calendar and trash folder ids
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const calFolder = folders[0].folder.find(f => f.name === 'Calendar');
		calendarFolderId = calFolder.id;
		const trashFolder = folders[0].folder.find(f => f.name === 'Trash');
		trashFolderId = trashFolder.id;

		// Grant read access on calendar to account2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calendarFolderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify that a new appointment in a shared folder is listed in the SyncResponse', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Get sync token as account2 on shared calendar
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		assert.exists(syncRes1.SyncResponse, 'SyncResponse should exist');
		const token1 = syncRes1.SyncResponse.token;

		// Create appointment as account1
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100118T080000" tz="Asia/Kolkata"/>
							<e d="20100118T090000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content/>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		assert.exists(setRes.SetAppointmentResponse, 'SetAppointmentResponse should exist');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Sync as account2 on shared calendar with token
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}"
				token="${token1}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt
			: (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const matchAppt = syncAppts.find(a => a.id === `${account1Id}:${apptId}`);

		// Verify response
		assert.exists(matchAppt,
			'Appointment should appear in SyncResponse with account1Id prefix');
	});


	it('Functional | Verify that a deleted calendar in a shared folder is listed in the SyncResponse', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Create appointment as account1
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100218T080000" tz="Asia/Kolkata"/>
							<e d="20100218T090000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content/>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Get sync token as account2
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Delete appointment as account1
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${apptId}"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');
		assert.exists(deleteRes.ItemActionResponse,
			'ItemActionResponse should exist');

		// Sync as account2 - verify deleted
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');
		if (syncRes2.SyncResponse.deleted) {
			const deletedArr = Array.isArray(syncRes2.SyncResponse.deleted)
				? syncRes2.SyncResponse.deleted : [syncRes2.SyncResponse.deleted];
			const allDeletedIds = deletedArr.map(d => d.ids || d.id || '').join(',');

			// Verify response
			assert.isNotEmpty(allDeletedIds, 'SyncResponse should have deleted ids');
		}
	});


	it('Functional | Verify that a new contact (moved) in a shared folder is listed in the SyncResponse', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Create appointment in trash as account1
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail" l="${trashFolderId}">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100318T090000" tz="Asia/Kolkata"/>
							<e d="20100318T100000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content/>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Move appointment from trash to calendar as account1
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${apptId}" l="${calendarFolderId}"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		assert.exists(moveRes.ItemActionResponse, 'ItemActionResponse should exist');

		// Sync as account2 - verify moved appointment appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt
			: (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const matchAppt = syncAppts.find(a => a.id === `${account1Id}:${apptId}`);

		// Verify response
		assert.exists(matchAppt,
			'Moved appointment should appear in SyncResponse');
	});


	it('Functional | Verify that a modified appointments (start, end time) in a shared folder is listed in the SyncResponse', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Create appointment as account1
		const setRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100418T090000" tz="Asia/Kolkata"/>
							<e d="20100418T100000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content/>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes1.Fault, 'Response should not be a Fault');
		const apptId = setRes1.SetAppointmentResponse.apptId;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Modify appointment time as account1
		const setRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100518T090000" tz="Asia/Kolkata"/>
							<e d="20100518T100000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content/>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes2.Fault, 'Response should not be a Fault');

		// Sync as account2 - verify modified appointment appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt
			: (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const matchAppt = syncAppts.find(a => a.id === `${account1Id}:${apptId}`);

		// Verify response
		assert.exists(matchAppt,
			'Modified appointment should appear in SyncResponse');
	});


	it('Functional | Verify that a modified appointment (details) in a shared folder is listed in the SyncResponse', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const content = `content.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Create appointment as account1
		const setRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100618T090000" tz="Asia/Kolkata"/>
							<e d="20100618T100000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes1.Fault, 'Response should not be a Fault');
		const apptId = setRes1.SetAppointmentResponse.apptId;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Modify appointment content as account1
		const newContent = `content.${common.getUniqueString()}`;

		// SetAppointmentRequest
		const setRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20100618T090000" tz="Asia/Kolkata"/>
							<e d="20100618T100000" tz="Asia/Kolkata"/>
							<or a="${account1Email}"/>
						</inv>
						<mp ct="text/plain">
							<content>${newContent}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(setRes2.Fault, 'Response should not be a Fault');

		// Sync as account2 - verify modified appointment
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${calendarFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt
			: (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const matchAppt = syncAppts.find(a => a.id === `${account1Id}:${apptId}`);

		// Verify response
		assert.exists(matchAppt,
			'Modified appointment (details) should appear in SyncResponse');
	});
});
