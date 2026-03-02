import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Calendar > Remaining Subdirs', function () {
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
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const token = await soap.getAccountAuthToken(email);
        return { email, token };
    }


    // FreeBusy/Bugs (1 test)
    it('Smoke | FreeBusy bug', async () => {
        const acct = await makeAcct('fb');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'FB bug not fault');
    });


    // FreeBusy/Folders (3 tests)
    it('Smoke | FreeBusy folders basic', async () => {
        const acct = await makeAcct('fb');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'FB folder not fault');
    });

    it('Sanity | FreeBusy folder create', async () => {
        const acct = await makeAcct('fb');
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="Cal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, acct.token
        );
        assert.notExists(
            folderRes.Fault, 'Create cal folder not fault'
        );
    });

    it('Sanity | FreeBusy folder appt', async () => {
        const acct = await makeAcct('fb');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="Cal${common.getUniqueString()}"
					l="1" view="appointment"/>
			</CreateFolderRequest>`, acct.token
        );
        const folderId = Array.isArray(
            folderRes.CreateFolderResponse.folder
        )
            ? folderRes.CreateFolderResponse.folder[0].id
            : folderRes.CreateFolderResponse.folder.id;
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'FB folder appt not fault');
    });


    // Mountpoint/MiniCal (2 tests)
    it('Smoke | Mountpoint MiniCal', async () => {
        const a1 = await makeAcct('mp');
        const a2 = await makeAcct('mp');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${a1.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, a1.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'MP MiniCal not fault');
    });

    it('Sanity | Mountpoint MiniCal shared', async () => {
        const a1 = await makeAcct('mp');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'MP shared not fault');
    });


    // Sharing/OutlookPermissions (3 tests)
    it('Smoke | Outlook sharing perm', async () => {
        const a1 = await makeAcct('sh');
        const a2 = await makeAcct('sh');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${a2.email}"
						perm="r"/>
				</action>
			</FolderActionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Outlook perm not fault');
    });

    it('Sanity | Outlook sharing rwidx', async () => {
        const a1 = await makeAcct('sh');
        const a2 = await makeAcct('sh');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${a2.email}"
						perm="rwidx"/>
				</action>
			</FolderActionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Outlook rwidx not fault');
    });

    it('Sanity | Outlook sharing revoke', async () => {
        const a1 = await makeAcct('sh');
        const a2 = await makeAcct('sh');
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" d="${a2.email}"
						perm="r"/>
				</action>
			</FolderActionRequest>`, a1.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="10" zid="${a2.email}"/>
			</FolderActionRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Revoke share not fault');
    });


    // Lmtp/Outlook (1 + 1 + 2 = 4 tests)
    it('Smoke | Lmtp calendar import', async () => {
        const acct = await makeAcct('lmtp');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Lmtp import not fault');
    });

    it('Sanity | Lmtp IMAP calendar', async () => {
        const acct = await makeAcct('lmtp');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'IMAP cal not fault');
    });

    it('Sanity | Lmtp Outlook 2007 create', async () => {
        const acct = await makeAcct('lmtp');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"
								tz="America/New_York"/>
							<e d="${t2}"
								tz="America/New_York"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Outlook 2007 not fault');
    });

    it('Sanity | Lmtp Outlook 2007 search', async () => {
        const acct = await makeAcct('lmtp');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"
								tz="Europe/London"/>
							<e d="${t2}"
								tz="Europe/London"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Outlook search not fault');
    });
});
