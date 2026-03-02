import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Recurrence', function () {
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

    async function createRecurAppt(token, email, subject, freq, count) {
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
							<recur>
								<add>
									<rule freq="${freq}">
										<interval ival="1"/>
										<count num="${count}"/>
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
			</CreateAppointmentRequest>`, token
        );
        return res.CreateAppointmentResponse;
    }


    // Appointment-Recur-Flow (28 tests)
    it('Smoke | Daily recurrence create', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        assert.exists(appt.calItemId, 'Should be created');
    });

    it('Sanity | Daily recurrence get', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Get should not fault');
    });

    it('Sanity | Daily recurrence search', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'DAI', 5);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search should not fault');
    });

    it('Sanity | Weekly recurrence create', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'WEE', 4
        );
        assert.exists(appt.calItemId, 'Weekly created');
    });

    it('Sanity | Monthly recurrence create', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'MON', 3
        );
        assert.exists(appt.calItemId, 'Monthly created');
    });

    it('Sanity | Yearly recurrence create', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'YEA', 2
        );
        assert.exists(appt.calItemId, 'Yearly created');
    });

    it('Sanity | Daily recurrence modify', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Modified</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Modify should not fault');
    });

    it('Sanity | Daily recurrence cancel', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Cancel should not fault');
    });

    it('Sanity | Daily recurrence delete', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Delete should not fault');
    });

    it('Sanity | Weekly recurrence search', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'WEE', 4);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 30 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Weekly search not fault');
    });

    it('Sanity | Monthly recurrence search', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'MON', 3);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 90 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Monthly search not fault');
    });

    it('Sanity | Daily recurrence with invitee', async () => {
        const acct = await makeAcct('rec');
        const inv = await makeAcct('inv');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Recurring with inv not fault');
    });

    it('Sanity | Recurrence F/B check', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'DAI', 3);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				uid="${acct.email}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'F/B should not fault');
    });

    it('Sanity | Recurrence count 10', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 10
        );
        assert.exists(appt.calItemId, 'Count 10 created');
    });

    it('Sanity | Recurrence interval 2', async () => {
        const acct = await makeAcct('rec');
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
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="2"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Interval 2 not fault');
    });

    it('Sanity | Recurrence weekly modify', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'WEE', 4
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
										<count num="2"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Weekly modify not fault');
    });

    it('Sanity | Recurrence monthly cancel', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'MON', 3
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Monthly cancel not fault');
    });

    it('Sanity | Recurrence yearly get', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'YEA', 2
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Yearly get not fault');
    });

    it('Sanity | Recurrence allday daily', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const d = new Date(Date.now() + 86400000);
        const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="F" transp="O"
							allDay="1">
							<s d="${dateStr}"/><e d="${dateStr}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Allday recur not fault');
    });

    it('Sanity | Recurrence private daily', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O"
							class="PRI">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Private recur not fault');
    });

    it('Sanity | Recurrence with alarm', async () => {
        const acct = await makeAcct('rec');
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
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
							<alarm action="DISPLAY">
								<trigger>
									<rel neg="1" m="15"
										related="START"/>
								</trigger>
							</alarm>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Recur with alarm not fault');
    });

    it('Sanity | Recurrence with location', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O"
							loc="Room 101">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="WEE">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Location recur not fault');
    });

    it('Sanity | Recurrence daily GetMsg', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 3
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'GetMsg not fault');
    });

    it('Sanity | Recurrence week count large', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'WEE', 52
        );
        assert.exists(appt.calItemId, 'Large count created');
    });

    it('Sanity | Recurrence daily move to trash', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 3
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="trash" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Trash should not fault');
    });

    it('Sanity | Recurrence daily tag', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 3
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Flag should not fault');
    });

    it('Sanity | Recurrence search after modify', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 3
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
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
					<su>${s} mod</su>
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
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s} mod</query>
			</SearchRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Search after mod not fault');
    });


    // Bug8990 (2 tests)
    it('Functional | Bug8990 - Recurring appt bug 1', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        assert.exists(appt.calItemId, 'Bug8990 created');
    });

    it('Functional | Bug8990 - Recurring appt bug 2', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'WEE', 4
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'Bug8990 get not fault');
    });


    // CheckRecurConflictsRequest (9 tests)
    it('Smoke | CheckRecurConflicts basic', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'DAI', 3);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Conflicts should not fault');
    });

    it('Sanity | CheckRecurConflicts no appts', async () => {
        const acct = await makeAcct('rec');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'No appts conflict not fault');
    });

    it('Sanity | CheckRecurConflicts two users', async () => {
        const a1 = await makeAcct('rec1');
        const a2 = await makeAcct('rec2');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(a1.token, a1.email, s, 'DAI', 3);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${a1.email}"/>
				<usr name="${a2.email}"/>
			</CheckRecurConflictsRequest>`, a1.token
        );
        assert.notExists(res.Fault, 'Two user not fault');
    });

    it('Sanity | CheckRecurConflicts wide range', async () => {
        const acct = await makeAcct('rec');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 90 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Wide range not fault');
    });

    it('Sanity | CheckRecurConflicts weekly', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'WEE', 4);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Weekly conflict not fault');
    });

    it('Sanity | CheckRecurConflicts monthly', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        await createRecurAppt(acct.token, acct.email, s, 'MON', 3);
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 90 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Monthly conflict not fault');
    });

    it('Sanity | CheckRecurConflicts past range', async () => {
        const acct = await makeAcct('rec');
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now - 30 * 86400000}" e="${now}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Past range not fault');
    });

    it('Sanity | CheckRecurConflicts multiple appts', async () => {
        const acct = await makeAcct('rec');
        await createRecurAppt(
            acct.token, acct.email,
            `S${common.getUniqueString()}`, 'DAI', 3
        );
        await createRecurAppt(
            acct.token, acct.email,
            `S${common.getUniqueString()}`, 'WEE', 4
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Multiple not fault');
    });

    it('Sanity | CheckRecurConflicts after delete', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 3
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'After delete not fault');
    });


    // ExpandRecur (2 tests)
    it('Sanity | ExpandRecur basic', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"
				s="${now}" e="${now + 30 * 86400000}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetRecur for ExpandRecur basic not fault');
    });

    it('Sanity | ExpandRecur weekly', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'WEE', 4
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"
				s="${now}" e="${now + 60 * 86400000}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetRecur for ExpandRecur weekly not fault');
    });


    // GetRecurRequest-Basic (3 tests)
    it('Smoke | GetRecur basic', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetRecur not fault');
    });

    it('Sanity | GetRecur weekly', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'WEE', 4
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetRecur weekly not fault');
    });

    it('Sanity | GetRecur after modify', async () => {
        const acct = await makeAcct('rec');
        const s = `Subj${common.getUniqueString()}`;
        const appt = await createRecurAppt(
            acct.token, acct.email, s, 'DAI', 5
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(res.Fault, 'GetRecur modified not fault');
    });
});
