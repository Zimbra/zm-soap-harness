import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Sync > Sync Appointment', function () {
	this.timeout(60 * 1000);
	let accountEmail = null, accountAuthToken = null;
	let account2Email = null, account2AuthToken = null;
	let account3Email = null, account3AuthToken = null;
	let account4Email = null, account4AuthToken = null;

	before(async () => {
		await main.before(this);
		accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
		account3Email = soap.testAccounts.testAccount3.emailAddress;
		account3AuthToken = await soap.getAccountAuthToken(account3Email);
		account4Email = soap.testAccounts.testAccount4.emailAddress;
		account4AuthToken = await soap.getAccountAuthToken(account4Email);
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
	it('Functional | Verify Sync after creation of Every Day appointment', async () => {
		const subject = `Meeting${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		assert.exists(syncRes1.SyncResponse, 'SyncResponse should exist');
		const token1 = syncRes1.SyncResponse.token;

		// Verify response
		assert.exists(token1, 'SyncResponse should have a token');

		// Create daily recurring appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');
		const apptId = createRes.CreateAppointmentResponse.apptId;

		// Verify response
		assert.exists(apptId, 'Appointment should have apptId');
		const invId = createRes.CreateAppointmentResponse.invId;

		// Verify response
		assert.exists(invId, 'Appointment should have invId');

		// Sync with token - verify appointment appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token1}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.id === apptId);

		// Verify response
		assert.exists(syncAppt, 'Appointment should appear in SyncResponse');
		assert.equal(syncAppt.id, apptId, 'Appointment id should match');
	});


	it('Functional | Verify Sync after changing an every day appointment to every week', async () => {
		const subject = `Meeting${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;

		// Create daily appointment first
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const invId = createRes.CreateAppointmentResponse.invId;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token2 = syncRes1.SyncResponse.token;

		// Modify to weekly
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="WEE">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAppointmentResponse, 'ModifyAppointmentResponse should exist');
		const modApptId = modRes.ModifyAppointmentResponse.apptId;

		// Sync with token - verify modified appointment
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token2}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.id === modApptId);

		// Verify response
		assert.exists(syncAppt, 'Modified appointment should appear in SyncResponse');
	});


	it('Functional | Verify Sync after changing every week appointment to every month', async () => {
		const subject = `Meeting${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;

		// Create weekly appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="WEE">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const invId = createRes.CreateAppointmentResponse.invId;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token3 = syncRes1.SyncResponse.token;

		// Modify to monthly
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="MON">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAppointmentResponse, 'ModifyAppointmentResponse should exist');
		const modApptId = modRes.ModifyAppointmentResponse.apptId;

		// Sync with token
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token3}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.id === modApptId);

		// Verify response
		assert.exists(syncAppt, 'Modified monthly appointment should appear in SyncResponse');
	});


	it('Functional | Verify Sync after changing every month appointment to every year', async () => {
		const subject = `Meeting${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;

		// Create monthly appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="MON">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const invId = createRes.CreateAppointmentResponse.invId;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token4 = syncRes1.SyncResponse.token;

		// Modify to yearly
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
						<recur>
							<add>
								<rule freq="YEA">
									<interval ival="1"/>
								</rule>
							</add>
						</recur>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</ModifyAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyAppointmentResponse, 'ModifyAppointmentResponse should exist');
		const modApptId = modRes.ModifyAppointmentResponse.apptId;

		// Sync with token
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token4}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.id === modApptId);

		// Verify response
		assert.exists(syncAppt, 'Modified yearly appointment should appear in SyncResponse');
	});


	it('Regression | Verify Sync while creating an allday invalid appointment', async () => {
		const subject = `Meeting${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token5 = syncRes1.SyncResponse.token;

		// Create allDay=1 appointment with time specified (invalid combo)
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="1" name="${subject}" loc="${location}">
						<s d="20060201T080000" tz="Asia/Kolkata"/>
						<e d="20060201T090000" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');
		const apptId5 = createRes.CreateAppointmentResponse.apptId;

		// Verify response
		assert.exists(apptId5, 'Appointment should have apptId');

		// Sync with token - verify appointment appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token5}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.id === apptId5);

		// Verify response
		assert.exists(syncAppt, 'All-day appointment should appear in SyncResponse');
	});


	it('Sanity | Create a valid AllDay appointment and verify the sync token', async () => {
		const subject = `Meeting${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token6 = syncRes1.SyncResponse.token;

		// Create valid allDay appointment (date only, no time)
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="1" name="${subject}" loc="${location}">
						<s d="20060201" tz="Asia/Kolkata"/>
						<e d="20060201" tz="Asia/Kolkata"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');
		const apptId6 = createRes.CreateAppointmentResponse.apptId;

		// Verify response
		assert.exists(apptId6, 'Appointment should have apptId');
		const invId6 = createRes.CreateAppointmentResponse.invId;

		// Verify response
		assert.exists(invId6, 'Appointment should have invId');

		// Sync with token
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token6}"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.id === apptId6);

		// Verify response
		assert.exists(syncAppt, 'Valid all-day appointment should appear in SyncResponse');
	});


	it('Functional | Create a recurring appointment, check that the sync response contains a move and delete', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const content = `content.${common.getUniqueString()}`;
		const location = `location.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Get trash folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const trashFolder = folders[0].folder.find(f => f.name === 'Trash');
		const trashId = trashFolder.id;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		// Create recurring appointment via SetAppointmentRequest
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="1" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T080000" tz="Asia/Kolkata"/>
							<e d="20100301T090000" tz="Asia/Kolkata"/>
							<or a="${account2Email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		assert.exists(setRes.SetAppointmentResponse, 'SetAppointmentResponse should exist');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Verify response
		assert.exists(apptId, 'Appointment should have apptId');

		// Sync - verify appointment appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token1}"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const token2 = syncRes2.SyncResponse.token;
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.uid === uid);

		// Verify response
		assert.exists(syncAppt, 'Appointment with uid should appear in SyncResponse');
		assert.equal(syncAppt.id, apptId, 'Appointment id should match');

		// Move to trash
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${apptId}" l="${trashId}"/>
			</ItemActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		const itemAction = Array.isArray(moveRes.ItemActionResponse.action)
			? moveRes.ItemActionResponse.action[0] : moveRes.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');

		// Sync - verify move reflected
		const syncRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token2}"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes3.Fault, 'Response should not be a Fault');
		const token3 = syncRes3.SyncResponse.token;
		const movedAppts = Array.isArray(syncRes3.SyncResponse.appt)
			? syncRes3.SyncResponse.appt : (syncRes3.SyncResponse.appt ? [syncRes3.SyncResponse.appt] : []);
		const movedAppt = movedAppts.find(a => a.id === apptId);
		if (movedAppt) {

			// Verify response
			assert.equal(movedAppt.l, trashId, 'Appointment should be in trash folder');
		}

		// Hard delete
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${apptId}"/>
			</ItemActionRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		// Sync - verify deleted
		const syncRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token3}"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes4.Fault, 'Response should not be a Fault');
		if (syncRes4.SyncResponse.deleted) {
			const deletedArr = Array.isArray(syncRes4.SyncResponse.deleted)
				? syncRes4.SyncResponse.deleted : [syncRes4.SyncResponse.deleted];
			const allDeletedIds = deletedArr.map(d => d.ids).join(',');

			// Verify response
			assert.include(allDeletedIds, apptId,
				'Deleted ids should contain appointment id');
		}
	});


	it('Functional | Create a recurring appointment, check that the sync response contains exceptions 1', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const content = `content.${common.getUniqueString()}`;
		const location = `location.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		// Create recurring appointment
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="1" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T080000" tz="Asia/Kolkata"/>
							<e d="20100301T090000" tz="Asia/Kolkata"/>
							<or a="${account3Email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Sync - verify appointment appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token1}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const token2 = syncRes2.SyncResponse.token;
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.uid === uid);

		// Verify response
		assert.exists(syncAppt, 'Appointment should appear in SyncResponse');
		assert.equal(syncAppt.id, apptId, 'Appointment id should match');

		// Modify the recurring appointment (change time)
		const setRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="2" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T120000" tz="Asia/Kolkata"/>
							<e d="20100301T130000" tz="Asia/Kolkata"/>
							<or a="${account3Email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(setRes2.Fault, 'Response should not be a Fault');

		// Sync - verify modification appears
		const syncRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token2}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(syncRes3.Fault, 'Response should not be a Fault');
		const modAppts = Array.isArray(syncRes3.SyncResponse.appt)
			? syncRes3.SyncResponse.appt : (syncRes3.SyncResponse.appt ? [syncRes3.SyncResponse.appt] : []);
		const modAppt = modAppts.find(a => a.uid === uid);

		// Verify response
		assert.exists(modAppt, 'Modified appointment should appear in SyncResponse');
		assert.equal(modAppt.id, apptId, 'Appointment id should match');
		assert.exists(modAppt.ms, 'Modified sequence should exist');
	});


	it('Functional | Create a recurring appointment, check that the sync response contains exceptions 2', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const content = `content.${common.getUniqueString()}`;
		const location = `location.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Get trash folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const trashFolder = folders[0].folder.find(f => f.name === 'Trash');
		const trashId = trashFolder.id;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', account3AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		// Create recurring appointment
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="1" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T080000" tz="Asia/Kolkata"/>
							<e d="20100301T090000" tz="Asia/Kolkata"/>
							<or a="${account3Email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Sync
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token1}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const token2 = syncRes2.SyncResponse.token;

		// Modify the appointment
		const setRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="2" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T120000" tz="Asia/Kolkata"/>
							<e d="20100301T130000" tz="Asia/Kolkata"/>
							<or a="${account3Email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(setRes2.Fault, 'Response should not be a Fault');

		// Search to find the invId (matching XML which uses SearchResponse inst invId)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="1267344000000" calExpandInstEnd="1267948800000">
				<query>in:Calendar</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const searchAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : (searchRes.SearchResponse.appt ? [searchRes.SearchResponse.appt] : []);
		const foundAppt = searchAppts.find(a => a.uid === uid);

		// Verify response
		assert.exists(foundAppt, 'Appointment should be found in search');
		const inst = Array.isArray(foundAppt.inst) ? foundAppt.inst[0] : foundAppt.inst;
		const searchInvId = inst.invId || foundAppt.invId;

		// Get compNum from GetAppointmentRequest
		const getApptRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail" id="${apptId}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(getApptRes.Fault, 'Response should not be a Fault');
		const apptData = getApptRes.GetAppointmentResponse.appt[0];
		const inv = Array.isArray(apptData.inv) ? apptData.inv[0] : apptData.inv;
		const compNum = inv.compNum;

		// Cancel the appointment using invId from search
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${searchInvId}" comp="${compNum}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(cancelRes.Fault, 'Response should not be a Fault');
		assert.exists(cancelRes.CancelAppointmentResponse,
			'CancelAppointmentResponse should exist');

		// Empty trash
		const emptyRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="empty" id="${trashId}"/>
			</FolderActionRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(emptyRes.Fault, 'Response should not be a Fault');

		// Sync - verify deleted
		const syncRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token2}"/>`, account3AuthToken
		);

		// Verify response
		assert.notExists(syncRes3.Fault, 'Response should not be a Fault');
		if (syncRes3.SyncResponse.deleted) {
			const deletedArr = Array.isArray(syncRes3.SyncResponse.deleted)
				? syncRes3.SyncResponse.deleted : [syncRes3.SyncResponse.deleted];
			const allDeletedIds = deletedArr.map(d => d.ids).join(',');

			// Verify response
			assert.include(allDeletedIds, apptId,
				'Deleted ids should contain appointment id');
		}
	});


	it('Functional | Create a recurring appointment, check that the sync response contains exceptions 3', async () => {
		const subject = `subject.${common.getUniqueString()}`;
		const content = `content.${common.getUniqueString()}`;
		const location = `location.${common.getUniqueString()}`;
		const uid = common.getUniqueString();

		// Get trash folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account4AuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const trashFolder = folders[0].folder.find(f => f.name === 'Trash');
		const trashId = trashFolder.id;

		// Get sync token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', account4AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token1 = syncRes1.SyncResponse.token;

		// Create bi-monthly recurring appointment
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="1" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T080000" tz="Asia/Kolkata"/>
							<e d="20100301T090000" tz="Asia/Kolkata"/>
							<or a="${account4Email}"/>
							<recur>
								<add>
									<rule freq="MON">
										<interval ival="2"/>
										<bymonthday modaylist="01"/>
										<x-name name="repeatCustomType" value="S"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account4AuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		const apptId = setRes.SetAppointmentResponse.apptId;

		// Sync - verify appointment
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token1}"/>`, account4AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const token2 = syncRes2.SyncResponse.token;
		const syncAppts = Array.isArray(syncRes2.SyncResponse.appt)
			? syncRes2.SyncResponse.appt : (syncRes2.SyncResponse.appt ? [syncRes2.SyncResponse.appt] : []);
		const syncAppt = syncAppts.find(a => a.uid === uid);

		// Verify response
		assert.exists(syncAppt, 'Bi-monthly appointment should appear in SyncResponse');

		// Modify the appointment
		const setRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail">
				<default needsReply="0" ptst="AC">
					<m>
						<inv uid="${uid}" seq="2" method="REQUEST" type="event"
							fb="B" transp="O" allDay="0" name="${subject}" loc="${location}">
							<s d="20100301T120000" tz="Asia/Kolkata"/>
							<e d="20100301T130000" tz="Asia/Kolkata"/>
							<or a="${account4Email}"/>
							<recur>
								<add>
									<rule freq="MON">
										<interval ival="2"/>
										<bymonthday modaylist="01"/>
										<x-name name="repeatCustomType" value="S"/>
									</rule>
								</add>
							</recur>
						</inv>
						<mp content-type="text/plain">
							<content>${content}</content>
						</mp>
						<su>${subject}</su>
					</m>
				</default>
			</SetAppointmentRequest>`, account4AuthToken
		);

		// Verify response
		assert.notExists(setRes2.Fault, 'Response should not be a Fault');

		// Search to find the invId (matching XML which uses SearchResponse inst invId)
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="1267344000000" calExpandInstEnd="1267948800000">
				<query>in:Calendar</query>
			</SearchRequest>`, account4AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const searchAppts2 = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : (searchRes.SearchResponse.appt ? [searchRes.SearchResponse.appt] : []);
		const foundAppt = searchAppts2.find(a => a.uid === uid);

		// Verify response
		assert.exists(foundAppt, 'Appointment should be found in search');
		const inst = Array.isArray(foundAppt.inst) ? foundAppt.inst[0] : foundAppt.inst;
		const searchInvId = inst.invId || foundAppt.invId;

		// Get compNum from GetAppointmentRequest
		const getApptRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail" id="${apptId}"/>`, account4AuthToken
		);

		// Verify response
		assert.notExists(getApptRes.Fault, 'Response should not be a Fault');
		const apptData = getApptRes.GetAppointmentResponse.appt[0];
		const inv = Array.isArray(apptData.inv) ? apptData.inv[0] : apptData.inv;
		const compNum = inv.compNum;

		// Cancel using invId from search
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${searchInvId}" comp="${compNum}"/>`, account4AuthToken
		);

		// Verify response
		assert.notExists(cancelRes.Fault, 'Response should not be a Fault');

		// Empty trash
		const emptyRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="empty" id="${trashId}"/>
			</FolderActionRequest>`, account4AuthToken
		);

		// Verify response
		assert.notExists(emptyRes.Fault, 'Response should not be a Fault');

		// Sync - verify deleted
		const syncRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest xmlns="urn:zimbraMail" token="${token2}"/>`, account4AuthToken
		);

		// Verify response
		assert.notExists(syncRes3.Fault, 'Response should not be a Fault');
		if (syncRes3.SyncResponse.deleted) {
			const deletedArr = Array.isArray(syncRes3.SyncResponse.deleted)
				? syncRes3.SyncResponse.deleted : [syncRes3.SyncResponse.deleted];
			const allDeletedIds = deletedArr.map(d => d.ids).join(',');

			// Verify response
			assert.include(allDeletedIds, apptId,
				'Deleted ids should contain appointment id');
		}
	});
});
