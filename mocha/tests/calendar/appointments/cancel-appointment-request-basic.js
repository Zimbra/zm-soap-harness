import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Cancel Appointment Request Basic', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTime(offsetMs) {
        const d = new Date(Date.now() + offsetMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

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

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Smoke | Delete Inline event', async () => {
        // Create account
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
        const epoch = 1764590400000;

        // Get calendar folder ID
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${accountEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Verify appointment exists via search
        const searchRes1 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${epoch - 86400000}"
				calExpandInstEnd="${epoch + 86400000}">
				<query>inid:${calFolder.id}</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes1.Fault, 'SearchRequest should not fault');
        const appts = Array.isArray(searchRes1.SearchResponse.appt)
            ? searchRes1.SearchResponse.appt : [searchRes1.SearchResponse.appt];
        assert.exists(appts[0].name, 'Appointment name should exist');

        // Cancel appointment
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<su>Cancelled${subject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${subject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, accountToken
        );
        assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');

        // Verify appointment no longer in calendar
        const searchRes2 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${epoch - 86400000}"
				calExpandInstEnd="${epoch + 86400000}">
				<query>inid:${calFolder.id}</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
        const appts2 = searchRes2.SearchResponse.appt
            ? (Array.isArray(searchRes2.SearchResponse.appt)
                ? searchRes2.SearchResponse.appt
                : [searchRes2.SearchResponse.appt])
            : [];
        const found = appts2.find(a => a.invId === invId);
        assert.notExists(found, 'Cancelled appointment should not exist');
    });


    it('Sanity | Create, Cancel, Modify an appointment from trash', async () => {
        // Create account
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

        // Get folder IDs
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');
        const trashFolder = allFolders.find(f => f.name === 'Trash');

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="Location">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountEmail}"/>
						<s d="${icalTime(3600000)}"/>
						<e d="${icalTime(2 * 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${accountEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Cancel appointment
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<su>Cancelled${subject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${subject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, accountToken
        );
        assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');

        // Try to cancel again - should get INVALID_REQUEST
        const cancelRes2 = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<su>Cancelled${subject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${subject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, accountToken
        );
        assert.isString(cancelRes2.Fault.Detail.Error.Code, 'Second cancel should fault');

        // Try to modify cancelled appointment - should get INVALID_REQUEST
        const modifyRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="New Subject">
						<s d="${icalTime(3600000)}"/>
						<e d="${icalTime(2 * 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>New Content</content>
					</mp>
					<su>New Subject</su>
				</m>
			</ModifyAppointmentRequest>`, accountToken
        );
        assert.isString(modifyRes.Fault.Detail.Error.Code, 'Modify cancelled appt should fault');

        // Try to create appointment in trash - should get INVALID_REQUEST
        const trashCreateRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${trashFolder.id}">
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="Location">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountEmail}"/>
						<s d="${icalTime(3600000)}"/>
						<e d="${icalTime(2 * 3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${accountEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.isString(trashCreateRes.Fault.Detail.Error.Code, 'Create in trash should fault');
    });
});
