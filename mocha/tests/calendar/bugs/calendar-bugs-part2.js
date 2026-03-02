import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Bugs > CalendarBugs-Part2', function () {
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


    it('Sanity | Bug23382 - Edit public apt shared series 1', async () => {
        const org = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
										<count num="4"/>
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
			</CreateAppointmentRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Bug23382 - Edit public apt shared series 2', async () => {
        const org = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const appt = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PUB">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
        );
        const invId = appt.CreateAppointmentResponse.invId;
        const modRes = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O" class="PUB">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Modified</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, org.token
        );
        assert.notExists(modRes.Fault, 'Modify should not fault');
    });


    it('Sanity | Bug26120 - Setup and verify 1', async () => {
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


    it('Sanity | Bug26120 - Setup and verify 2', async () => {
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


    it('Sanity | Bug28615 - Setup multi-account 1', async () => {
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


    it('Sanity | Bug28615 - Setup multi-account 2', async () => {
        const acct1 = await makeAcct('org');
        const acct2 = await makeAcct('inv');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct2.email}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'F/B should not fault');
    });


    it('Sanity | Bug28892 - Edit shared private series', async () => {
        const org = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PRI">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Bug34836 - Edit public apt private series', async () => {
        const org = await makeAcct('org');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PRI">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
										<count num="4"/>
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
			</CreateAppointmentRequest>`, org.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Bug59163 - Setup and verify', async () => {
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


    it('Sanity | Bug59470 - Setup and verify', async () => {
        const acct = await makeAcct('org');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetInfoRequest xmlns="urn:zimbraAccount"
				sections="mbox"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetInfo should not fault');
    });


    it('Sanity | Bug62674 - Search resource by description', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        const desc = `Desc${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
				<a n="description">${desc}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        const searchRes = await soap.makeSOAPEnvelopeAdmin(
            `<SearchCalendarResourcesRequest xmlns="urn:zimbraAccount"
				limit="10" offset="0" attrs="fullName,email">
				<searchFilter>
					<conds>
						<cond attr="zimbraCalResType"
							op="eq" value="Equipment"/>
					</conds>
				</searchFilter>
			</SearchCalendarResourcesRequest>`, adminAuthToken
        );
        assert.notExists(searchRes.Fault, 'Search res should not fault');
    });


    it('Functional | Bug6460 - Private appt in shared cal', async () => {
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
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const subject = `Priv${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PRI">
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
        assert.notExists(res.Fault, 'Private appt should not fault');
    });
});
