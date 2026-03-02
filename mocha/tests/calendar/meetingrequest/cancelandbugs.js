import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > CancelAndBugs', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function futureTime(offsetMs) {
        const d = new Date(Date.now() + offsetMs);
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

    async function makeAcct(prefix) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const id = res.CreateAccountResponse.account[0].id;
        const token = await soap.getAccountAuthToken(email);
        return { email, id, token };
    }

    async function createMeeting(orgToken, orgEmail, inviteeEmail, subject) {
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${orgEmail}"/>
							<at a="${inviteeEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${inviteeEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        return res.CreateAppointmentResponse;
    }


    it('Smoke | Cancel meeting request basic', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );

        // Cancel via CancelAppointmentRequest
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Meeting cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
        );
        assert.notExists(
            cancelRes.Fault,
            'Cancel should not fault'
        );
    });


    it('Sanity | Cancel meeting request with message', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );

        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancellation notice</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
        );
        assert.notExists(
            cancelRes.Fault,
            'Cancel with message should not fault'
        );
    });


    it('Sanity | Cancel meeting and delete from calendar', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );

        // Cancel
        await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
        );

        // Delete
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, org.token
        );
        assert.notExists(
            delRes.Fault,
            'Delete should not fault'
        );
    });


    it('Sanity | Grant calendar access for meeting', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');

        // Get calendar folder
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>',
            acct1.token
        );
        const root = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder[0]
            : folderRes.GetFolderResponse.folder;
        const subs = Array.isArray(root.folder)
            ? root.folder : [root.folder];
        const cal = subs.find(f => f.name === 'Calendar');

        const res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${cal.id}" op="grant">
					<grant d="${acct2.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct1.token
        );
        assert.notExists(res.Fault, 'Grant should not fault');
    });


    it('Sanity | Verify granted calendar access', async () => {
        const acct1 = await makeAcct('acct1');
        const acct2 = await makeAcct('acct2');

        // Grant and verify via GetFolder
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>',
            acct1.token
        );
        const root = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder[0]
            : folderRes.GetFolderResponse.folder;
        const subs = Array.isArray(root.folder)
            ? root.folder : [root.folder];
        const cal = subs.find(f => f.name === 'Calendar');

        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${cal.id}" op="grant">
					<grant d="${acct2.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct1.token
        );

        // Check grants visible in GetFolder
        const checkRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>',
            acct1.token
        );
        assert.notExists(
            checkRes.Fault,
            'GetFolder should show grants'
        );
    });


    it('Functional | Bug - meeting request edge case 1', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );

        // Get appointment to verify
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
        );
        assert.notExists(getRes.Fault, 'Get should not fault');
    });


    it('Functional | Bug - meeting request edge case 2', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createMeeting(
            org.token, org.email, inv.email, subject
        );

        // Modify and verify
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject} mod">
							<or a="${org.email}"/>
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Modified</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, org.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Bug - meeting request edge case 3', async () => {
        const org = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        await createMeeting(org.token, org.email, inv.email, subject);

        // Search for meeting
        const now = Date.now();
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, org.token
        );
        assert.notExists(
            searchRes.Fault,
            'Search should not fault'
        );
    });
});
