import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Bugs > CalendarBugs-Part4', function () {
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

    async function getCalFolder(token) {
        const r = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', token
        );
        const root = Array.isArray(r.GetFolderResponse.folder)
            ? r.GetFolderResponse.folder[0]
            : r.GetFolderResponse.folder;
        const subs = Array.isArray(root.folder)
            ? root.folder : [root.folder];
        return {
            rootId: root.id,
            calId: subs.find(f => f.name === 'Calendar').id
        };
    }


    it('Functional | Bug74400 - No move invitations 1', async () => {
        const acct = await makeAcct('org');
        const inv = await makeAcct('inv');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Functional | Bug74400 - No move invitations 2', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        // Create subfolder
        const calFolder = await getCalFolder(acct.token);
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubCal${common.getUniqueString()}"
					l="${calFolder.calId}" view="appointment"/>
			</CreateFolderRequest>`, acct.token
        );
        assert.notExists(folderRes.Fault, 'SubCal should be created');
    });


    it('Functional | Bug74400 - No move invitations 3', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        // Modify
        const invId = appt.CreateAppointmentResponse.invId;
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Functional | Bug74400 - No move invitations 4', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const calItemId = appt.CreateAppointmentResponse.calItemId;
        const delRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(delRes.Fault, 'Delete should not fault');
    });


    it('Functional | Bug78473 - Shared calendar search', async () => {
        const owner = await makeAcct('own');
        const sharee = await makeAcct('shr');
        const ownerCal = await getCalFolder(owner.token);
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCal.calId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, owner.token
        );
        const shreeCal = await getCalFolder(sharee.token);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${shreeCal.rootId}"
					name="SC${common.getUniqueString()}"
					view="appointment"
					rid="${ownerCal.calId}"
					zid="${owner.id}"/>
			</CreateMountpointRequest>`, sharee.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, sharee.token
        );
        assert.notExists(res.Fault, 'Shared search should not fault');
    });


    it('Sanity | Bug84029 - Annual recurrence before 1870', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Annual recurrence should not fault');
    });


    it('Sanity | Bug84501 - REST freebusy access', async () => {
        const acct = await makeAcct('org');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'F/B should not fault');
    });


    it('Sanity | Bug86864 - Forward invite as ics', async () => {
        const acct = await makeAcct('org');
        const inv = await makeAcct('inv');
        // Set pref
        await soap.makeSOAPEnvelopeAccount(
            `<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarAutoAddInvites">
					FALSE
				</pref>
			</ModifyPrefsRequest>`, inv.token
        );
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Functional | Bug87690 - Delete from shared folder', async () => {
        const owner = await makeAcct('own');
        const sharee = await makeAcct('shr');
        const ownerCal = await getCalFolder(owner.token);
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${ownerCal.calId}" op="grant">
					<grant d="${sharee.email}" gt="usr"
						perm="rwidxa"/>
				</action>
			</FolderActionRequest>`, owner.token
        );
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${owner.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, owner.token
        );
        assert.exists(
            appt.CreateAppointmentResponse.calItemId,
            'Should be created'
        );
    });


    it('Sanity | Bug89682 - Import ics file', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.exists(
            appt.CreateAppointmentResponse.calItemId,
            'Should be created'
        );
    });


    it('Smoke | Bug98571 - Account setup verify 1', async () => {
        const acct = await makeAcct('org');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetInfoRequest xmlns="urn:zimbraAccount"
				sections="mbox"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetInfo should not fault');
    });


    it('Smoke | Bug98571 - Account setup verify 2', async () => {
        const acct = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.exists(
            appt.CreateAppointmentResponse.calItemId,
            'Appt should be created'
        );
    });
});
