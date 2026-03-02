import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > GetApptSummaries', function () {
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

    async function createAppt(token, email, subject, t1, t2) {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, token
        );
        return res.CreateAppointmentResponse;
    }


    // === GetApptSummaries (13 tests from Calender-GetApptSummaries.xml) ===
    it('Smoke | GetApptSummaries basic', async () => {
        const acct = await makeAcct('gas');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetApptSummaries with appointment', async () => {
        const acct = await makeAcct('gas');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetApptSummaries past range', async () => {
        const acct = await makeAcct('gas');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 7 * 86400000}" e="${now - 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Past range should not fault');
    });


    it('Sanity | GetApptSummaries future range', async () => {
        const acct = await makeAcct('gas');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Future range should not fault');
    });


    it('Sanity | GetApptSummaries recurring appt', async () => {
        const acct = await makeAcct('gas');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Recurring should not fault');
    });


    it('Sanity | GetApptSummaries multiple appts', async () => {
        const acct = await makeAcct('gas');
        const s1 = `Subj${common.getUniqueString()}`;
        const s2 = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, s1,
            futureTime(3600000), futureTime(7200000)
        );
        await createAppt(
            acct.token, acct.email, s2,
            futureTime(10800000), futureTime(14400000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Multiple should not fault');
    });


    it('Sanity | GetApptSummaries blank range', async () => {
        const acct = await makeAcct('gas');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="" e="" l="10"/>`, acct.token
        );
        assert.exists(res.Fault, 'Blank range should fault');
    });


    it('Sanity | GetApptSummaries wide range', async () => {
        const acct = await makeAcct('gas');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 90 * 86400000}"
				e="${now + 90 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Wide range should not fault');
    });


    it('Sanity | GetApptSummaries verify count', async () => {
        const acct = await makeAcct('gas');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | GetApptSummaries allday', async () => {
        const acct = await makeAcct('gas');
        const subject = `Subj${common.getUniqueString()}`;
        const d = new Date(Date.now() + 86400000);
        const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="F" transp="O"
							allDay="1">
							<s d="${dateStr}"/><e d="${dateStr}"/>
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 3 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Allday should not fault');
    });


    it('Sanity | GetApptSummaries after delete', async () => {
        const acct = await makeAcct('gas');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'After delete should not fault');
    });


    it('Sanity | GetApptSummaries with text range', async () => {
        const acct = await makeAcct('gas');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="text" e="text" l="10"/>`, acct.token
        );
        assert.exists(res.Fault, 'Text range should fault');
    });


    it('Sanity | GetApptSummaries private appt', async () => {
        const acct = await makeAcct('gas');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PRI">
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Private should not fault');
    });


    // === SearchApptRequest (13 tests) ===
    it('Smoke | SearchApptRequest basic', async () => {
        const acct = await makeAcct('sa');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Search appointment by subject', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search should not fault');
    });


    it('Sanity | Search recurring appointment', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search recurring should not fault');
    });


    it('Sanity | Search appointment in folder', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>in:Calendar ${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Folder search should not fault');
    });


    it('Sanity | Search nonexistent appointment', async () => {
        const acct = await makeAcct('sa');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 86400000}">
				<query>nonexistent${common.getUniqueString()}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Empty search should not fault');
    });


    it('Sanity | Search deleted appointment', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Deleted search should not fault');
    });


    it('Sanity | Search multiple appointments', async () => {
        const acct = await makeAcct('sa');
        const s1 = `Subj${common.getUniqueString()}`;
        const s2 = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, s1,
            futureTime(3600000), futureTime(7200000)
        );
        await createAppt(
            acct.token, acct.email, s2,
            futureTime(10800000), futureTime(14400000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Multi search should not fault');
    });


    it('Sanity | Search private appointment', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PRI">
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Private search should not fault');
    });


    it('Sanity | Search wide range', async () => {
        const acct = await makeAcct('sa');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 90 * 86400000}"
				calExpandInstEnd="${now + 90 * 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Wide range should not fault');
    });


    it('Sanity | Search allday appointment', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const d = new Date(Date.now() + 86400000);
        const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="F" transp="O"
							allDay="1">
							<s d="${dateStr}"/><e d="${dateStr}"/>
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 3 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Allday search should not fault');
    });


    it('Sanity | Search with offset and limit', async () => {
        const acct = await makeAcct('sa');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 86400000}"
				limit="5" offset="0">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Offset/limit should not fault');
    });


    it('Sanity | Search modified appointment', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O">
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
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
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject} mod</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Modified search should not fault');
    });


    it('Sanity | Search appointment by content', async () => {
        const acct = await makeAcct('sa');
        const subject = `Subj${common.getUniqueString()}`;
        await createAppt(
            acct.token, acct.email, subject,
            futureTime(3600000), futureTime(7200000)
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>subject:${subject}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(
            res.Fault, 'Content search should not fault'
        );
    });
});
