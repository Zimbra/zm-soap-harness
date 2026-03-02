import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Create Appointment Request Email Reminder', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTimeFromEpoch(epochMs) {
        const d = new Date(epochMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    it('Smoke | Setup single events and set reminder to email for First time - Minutes', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const content = `Content of the message${common.getUniqueString()}`;
        const epoch = 1514808000000;

        // Get calendar folder
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountToken
        );
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // Create appointment with email reminder
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${accountEmail}"/>
							<at a="admin@${testDomain}" role="REQ" ptst="NE"
								rsvp="1"/>
							<alarm action="EMAIL">
								<trigger>
									<rel related="START" neg="1" m="30"/>
								</trigger>
								<desc>Reminder 1</desc>
								<summary>Reminder mail of meeting</summary>
								<at a="admin@${testDomain}"/>
								<repeat count="2" m="10"/>
							</alarm>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Verify appointment created
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, accountToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');

        // Search and verify alarm flag
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${epoch - 86400000}"
				calExpandInstEnd="${epoch + 86400000}">
				<query>inid:${calFolder.id}</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.appt, 'Appointment should exist');
    });
});
