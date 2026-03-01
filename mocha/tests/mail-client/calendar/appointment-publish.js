import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Calendar > Appointments > appointment_publish', function () {
    this.timeout(300 * 1000);
    let adminAuthToken;
    let account1Name, account2Name;
    let account1CalFolderId, account1RootFolderId;
    let account2RootFolderId;
    let account1CalId2;
    const uid = common.getUniqueString();
    const apptSubject = `Subject of meeting${uid}`;
    const apptSubject2 = `addalarm${uid}`;
    const apptSubject3 = `TestAppt.${uid}`;
    const apptLocation = `Location of meeting${uid}`;
    const apptContent = `Content of the message${uid}`;
    const reminderText = 'Reminder 1';

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();

        account1Name = `publisher${uid}@${config.testDomain}`;
        account2Name = `subscriber${uid}@${config.testDomain}`;

        // Create accounts
        for (const name of [account1Name, account2Name]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }

        // Login as account1 and get folder IDs
        const acct1Auth = await soap.getAccountAuthToken(account1Name);
        const getFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
        );

        const findFolder = (folders, name) => {
            if (!folders) return null;
            const arr = Array.isArray(folders) ? folders : [folders];
            for (const f of arr) {
                if (f?.name === name) return f.id;
                const sub = findFolder(f?.folder, name);
                if (sub) return sub;
            }
            return null;
        };
        account1CalFolderId = findFolder(getFolderRes.GetFolderResponse?.folder, 'Calendar');
        account1RootFolderId = findFolder(getFolderRes.GetFolderResponse?.folder, 'USER_ROOT');

        // Create a subscribed calendar folder in account1
        const createFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="Formula1" l="${account1RootFolderId}" view="appointment"/>
			</CreateFolderRequest>`, acct1Auth
        );
        account1CalId2 = createFolderRes.CreateFolderResponse?.folder?.id;

        // Login as account2 and get root folder ID
        const acct2Auth = await soap.getAccountAuthToken(account2Name);
        const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2Auth
        );
        account2RootFolderId = findFolder(getFolderRes2.GetFolderResponse?.folder, 'USER_ROOT');
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it.skip('Smoke | Subscribe to any ical published calendar', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);

        // Create an appointment in the far future
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${apptSubject}">
							<s d="20500101T120000Z"/>
							<e d="20500101T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, acct1Auth
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');
        const apptId = createRes.CreateAppointmentResponse?.apptId;
        assert.match(String(apptId), /^\d+$/, 'apptId should be numeric');
        const calItemId = createRes.CreateAppointmentResponse?.calItemId;
        assert.match(String(calItemId), /^\d+$/, 'calItemId should be numeric');
        const invId = createRes.CreateAppointmentResponse?.invId;
        assert.match(String(invId), /^\d+-\d+$/, 'invId should match d-d pattern');

        // Share that calendar to public
        const grantRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account1CalFolderId}" op="grant">
					<grant d="${account2Name}" gt="pub" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1Auth
        );
        assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');
        assert.exists(grantRes.FolderActionResponse?.action,
            'FolderActionResponse action should exist');

        // Login as account2
        const acct2Auth = await soap.getAccountAuthToken(account2Name);

        // Create a calendar-folder to subscribe to the publish calendar
        const subRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="Publish-cal" l="${account2RootFolderId}"
					url="https://${config.zimbraServer}/home/${account1Name}/Calendar"
					view="appointment"/>
			</CreateFolderRequest>`, acct2Auth
        );
        assert.notExists(subRes.Fault, 'CreateFolderRequest should not fault');
        const pubCalId = subRes.CreateFolderResponse?.folder?.id;
        assert.exists(pubCalId, 'Published calendar folder id should exist');

        // Verify appointment is visible via GetApptSummaries
        const dayBefore = new Date('2049-12-31').getTime();
        const dayAfter = new Date('2050-01-02').getTime();
        const summRes = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				l="${pubCalId}" s="${dayBefore}" e="${dayAfter}"/>`, acct2Auth
        );
        assert.notExists(summRes.Fault, 'GetApptSummariesRequest should not fault');
        assert.exists(summRes.GetApptSummariesResponse,
            'GetApptSummariesResponse should exist');
    });


    it.skip('Functional | Adding personal reminders on shared appointments', async () => {
        // Login as account2
        const acct2Auth = await soap.getAccountAuthToken(account2Name);

        // Create a subscribed calendar folder
        const subRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="Formula1-sub" l="${account2RootFolderId}" view="appointment"/>
			</CreateFolderRequest>`, acct2Auth
        );
        assert.notExists(subRes.Fault, 'CreateFolderRequest should not fault');
        const subCalId = subRes.CreateFolderResponse?.folder?.id;

        // Create a test appointment in account2's subscribed calendar
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${subCalId}">
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="Christmas Day">
							<s d="20131101T120000Z"/>
							<e d="20131101T130000Z"/>
							<or a="${account2Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Holiday</content>
					</mp>
					<su>Christmas Day</su>
				</m>
			</CreateAppointmentRequest>`, acct2Auth
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const apptInvId = createRes.CreateAppointmentResponse?.invId;
        assert.exists(apptInvId, 'invId should exist');

        // Get the appointment details for time values
        const getApptRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${apptInvId}"/>`, acct2Auth
        );
        assert.notExists(getApptRes.Fault, 'GetAppointmentRequest should not fault');
        const comp = getApptRes.GetAppointmentResponse?.appt?.inv?.comp;
        const compItem = Array.isArray(comp) ? comp[0] : comp;
        const startD = compItem?.s?.d;
        const endD = compItem?.e?.d;
        const tz = compItem?.e?.tz;
        const compNum = getApptRes.GetAppointmentResponse?.appt?.inv?.compNum || 0;

        // Modify the appointment to add a personal reminder
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptInvId}" comp="${compNum}">
				<m>
					<inv name="Christmas Day">
						<s d="${startD}"${tz ? ` tz="${tz}"` : ''}/>
						<e d="${endD}"${tz ? ` tz="${tz}"` : ''}/>
						<alarm action="DISPLAY">
							<trigger>
								<rel related="START" neg="1" h="3"/>
							</trigger>
							<desc>${reminderText}</desc>
						</alarm>
					</inv>
				</m>
			</ModifyAppointmentRequest>`, acct2Auth
        );
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        assert.exists(modRes.ModifyAppointmentResponse,
            'ModifyAppointmentResponse should exist');

        // Verify alarm was added
        const getApptRes2 = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${apptInvId}"/>`, acct2Auth
        );
        assert.notExists(getApptRes2.Fault, 'GetAppointmentRequest should not fault');
        const comp2 = getApptRes2.GetAppointmentResponse?.appt?.inv?.comp;
        const compItem2 = Array.isArray(comp2) ? comp2[0] : comp2;
        const alarm = compItem2?.alarm;
        const alarmItem = Array.isArray(alarm) ? alarm[0] : alarm;
        assert.exists(alarmItem, 'Alarm should exist on appointment');
        assert.equal(alarmItem?.action, 'DISPLAY', 'Alarm action should be DISPLAY');
    });


    it.skip('Functional | Adding personal reminders on shared appointments and verify it doesnt discard local reminder', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);

        // Create appointment with alarm set
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${apptSubject2}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
							<alarm action="DISPLAY">
								<trigger>
									<rel related="START" neg="1" m="30"/>
								</trigger>
								<desc>${reminderText}</desc>
								<repeat count="2" m="10"/>
							</alarm>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject2}</su>
				</m>
			</CreateAppointmentRequest>`, acct1Auth
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse?.invId;
        assert.exists(invId, 'invId should exist');

        // Search for appointment in published calendar folder
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment" fetch="all"
				calExpandInstStart="1195929000000" calExpandInstEnd="1199557800000">
				<query>${apptSubject2}</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

        // Get appointment details
        const getApptRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${invId}"/>`, acct1Auth
        );
        assert.notExists(getApptRes.Fault, 'GetAppointmentRequest should not fault');
        const comp = getApptRes.GetAppointmentResponse?.appt?.inv?.comp;
        const compItem = Array.isArray(comp) ? comp[0] : comp;
        const startD = compItem?.s?.d;
        const endD = compItem?.e?.d;
        const compNum = getApptRes.GetAppointmentResponse?.appt?.inv?.compNum || 0;

        // Modify the appointment adding a new alarm
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="${compNum}">
				<m>
					<inv>
						<s d="${startD}"/>
						<e d="${endD}"/>
						<alarm action="DISPLAY">
							<trigger>
								<rel related="START" neg="1" h="3"/>
							</trigger>
							<desc>${reminderText}</desc>
						</alarm>
					</inv>
				</m>
			</ModifyAppointmentRequest>`, acct1Auth
        );
        assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
        assert.exists(modRes.ModifyAppointmentResponse,
            'ModifyAppointmentResponse should exist');

        // Verify alarm exists
        const getApptRes2 = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${invId}"/>`, acct1Auth
        );
        assert.notExists(getApptRes2.Fault, 'GetAppointmentRequest should not fault');
        const comp2 = getApptRes2.GetAppointmentResponse?.appt?.inv?.comp;
        const compItem2 = Array.isArray(comp2) ? comp2[0] : comp2;
        const alarm = compItem2?.alarm;
        const alarmItem = Array.isArray(alarm) ? alarm[0] : alarm;
        assert.exists(alarmItem, 'Alarm should exist');
        assert.equal(alarmItem?.action, 'DISPLAY', 'Alarm action should be DISPLAY');
    });


    it.skip('Functional | Adding personal appointments in the mounted calendar', async () => {
        // Login as account1
        const acct1Auth = await soap.getAccountAuthToken(account1Name);

        // Create appointment in the Formula1 (mounted) folder
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${account1CalId2}">
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${apptSubject3}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject3}</su>
				</m>
			</CreateAppointmentRequest>`, acct1Auth
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(createRes.CreateAppointmentResponse,
            'CreateAppointmentResponse should exist');
        const invId = createRes.CreateAppointmentResponse?.invId;
        assert.exists(invId, 'invId should exist');

        // Search for the appointment in the mounted calendar folder
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment" fetch="all"
				calExpandInstStart="1195929000000" calExpandInstEnd="1199557800000">
				<query>${apptSubject3} (inid:${account1CalId2})</query>
			</SearchRequest>`, acct1Auth
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
        const appt = Array.isArray(searchRes.SearchResponse?.appt)
            ? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse?.appt;
        assert.exists(appt, 'Appointment should be found in mounted calendar');
        assert.equal(appt?.name, apptSubject3,
            'Appointment name should match');
    });
});
