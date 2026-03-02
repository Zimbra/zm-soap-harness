import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Calendar > Snooze Calendar Item Alarm Request', function () {
    this.timeout(60 * 1000);
    let adminAuthToken;

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
    it('Smoke | Create Single event with reminder ans snooze it', async () => {
        // Create the account
        const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

        // Get calendar folder id
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

        // Create a single event with reminder
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const now = new Date();
        const startTime = new Date(now.getTime() + 15 * 60000);
        const endTime = new Date(now.getTime() + 3600000);
        const pad = (n) => String(n).padStart(2, '0');
        const icalStart = `${startTime.getFullYear()}${pad(startTime.getMonth() + 1)}${pad(startTime.getDate())}T${pad(startTime.getHours())}${pad(startTime.getMinutes())}00`;
        const icalEnd = `${endTime.getFullYear()}${pad(endTime.getMonth() + 1)}${pad(endTime.getDate())}T${pad(endTime.getHours())}${pad(endTime.getMinutes())}00`;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${subject}">
							<s d="${icalStart}"/>
							<e d="${icalEnd}"/>
							<or a="${accountEmail}"/>
							<alarm action="DISPLAY">
								<trigger>
									<rel m="15" related="START" neg="1"/>
								</trigger>
							</alarm>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const apptId = createRes.CreateAppointmentResponse.apptId;

        // Snooze the alarm
        const snoozeUntil = String(now.getTime() + 5 * 60000);
        const snoozeRes = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt xmlns="" id="${apptId}" until="${snoozeUntil}"/>
			</SnoozeCalendarItemAlarmRequest>`, accountAuthToken
        );

        // Verify snooze response
        assert.notExists(snoozeRes.Fault, 'SnoozeCalendarItemAlarmRequest should not fault');
        assert.exists(
            snoozeRes.SnoozeCalendarItemAlarmResponse,
            'SnoozeCalendarItemAlarmResponse should exist'
        );
    });


    it('Sanity | Create Single task with reminder and snooze it', async () => {
        // Create the account
        const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

        // Get tasks folder id
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const rootFolder = folders[0];
        const allFolders = Array.isArray(rootFolder.folder)
            ? rootFolder.folder : [rootFolder.folder];
        const taskFolder = allFolders.find(f => f.name === 'Tasks');
        assert.exists(taskFolder, 'Tasks folder should exist');
        const taskFolderId = taskFolder.id;

        // Create a task with reminder
        const subject = `Subject of task${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const now = new Date();
        const startTime = new Date(now.getTime() + 15 * 60000);
        const endTime = new Date(now.getTime() + 3600000);
        const alarmTime = new Date(now.getTime() + 5 * 3600000);
        const pad = (n) => String(n).padStart(2, '0');
        const icalStart = `${startTime.getFullYear()}${pad(startTime.getMonth() + 1)}${pad(startTime.getDate())}T${pad(startTime.getHours())}${pad(startTime.getMinutes())}00`;
        const icalEnd = `${endTime.getFullYear()}${pad(endTime.getMonth() + 1)}${pad(endTime.getDate())}T${pad(endTime.getHours())}${pad(endTime.getMinutes())}00`;
        const icalAlarm = `${alarmTime.getFullYear()}${pad(alarmTime.getMonth() + 1)}${pad(alarmTime.getDate())}T${pad(alarmTime.getHours())}${pad(alarmTime.getMinutes())}00Z`;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="${taskFolderId}">
					<inv method="REQUEST">
						<comp priority="1" percentComplete="50" status="INPR" allDay="0" name="${subject}" loc="Location">
							<s d="${icalStart}"/>
							<e d="${icalEnd}"/>
							<or a="${accountEmail}"/>
							<alarm action="DISPLAY">
								<trigger>
									<abs d="${icalAlarm}"/>
								</trigger>
							</alarm>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateTaskRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateTaskRequest should not fault');
        const taskCalItemId = createRes.CreateTaskResponse.calItemId;

        // Snooze the task alarm
        const snoozeUntil = String(now.getTime() + 6 * 3600000);
        const snoozeRes = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt xmlns="" id="${taskCalItemId}" until="${snoozeUntil}"/>
			</SnoozeCalendarItemAlarmRequest>`, accountAuthToken
        );

        // Verify snooze response
        assert.notExists(snoozeRes.Fault, 'SnoozeCalendarItemAlarmRequest should not fault');
        assert.exists(
            snoozeRes.SnoozeCalendarItemAlarmResponse,
            'SnoozeCalendarItemAlarmResponse should exist'
        );
    });
});
