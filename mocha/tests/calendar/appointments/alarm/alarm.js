import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Alarm', function () {
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

    async function createApptWithAlarm(token, email, subject, mins) {
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
							<alarm action="DISPLAY">
								<trigger>
									<rel neg="1" m="${mins}"
										related="START"/>
								</trigger>
							</alarm>
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


    it('Smoke | DismissCalendarItemAlarmRequest basic', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 15
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Dismiss should not fault');
    });


    it('Sanity | Dismiss alarm with valid calItemId', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 10
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Dismiss alarm with invalid id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="99999" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Invalid id should not fault');
    });


    it('Sanity | Dismiss alarm - verify dismissed', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 5
        );
        await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
        );
        assert.notExists(getRes.Fault, 'Get should not fault');
    });


    it('Sanity | Dismiss multiple alarms', async () => {
        const acct = await makeAcct('alm');
        const s1 = `Subj${common.getUniqueString()}`;
        const s2 = `Subj${common.getUniqueString()}`;
        const a1 = await createApptWithAlarm(
            acct.token, acct.email, s1, 15
        );
        const a2 = await createApptWithAlarm(
            acct.token, acct.email, s2, 10
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${a1.calItemId}"
					dismissedAt="${Date.now()}"/>
				<appt id="${a2.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Multiple dismiss should not fault');
    });


    it('Sanity | Dismiss with blank id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.exists(res.Fault, 'Blank id should fault');
    });


    it('Sanity | Dismiss with text id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="sometext" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.exists(res.Fault, 'Text id should fault');
    });


    it('Sanity | Dismiss specific alarm after create', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 30
        );
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${now}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Dismiss with negative id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="-1" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Negative id should not fault');
    });


    it('Sanity | Dismiss recurring appointment alarm', async () => {
        const acct = await makeAcct('alm');
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
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const calItemId = res.CreateAppointmentResponse.calItemId;
        const dismissRes = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(
            dismissRes.Fault, 'Recurring dismiss should not fault'
        );
    });


    it('Smoke | SnoozeCalendarItemAlarmRequest basic', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 15
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Snooze should not fault');
    });


    it('Sanity | Snooze alarm 5 minutes', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 10
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Snooze alarm 15 minutes', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 15
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 900000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });


    it('Sanity | Snooze with invalid id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="99999" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Invalid id should not fault');
    });


    it('Sanity | Snooze with blank id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.exists(res.Fault, 'Blank id should fault');
    });


    it('Sanity | Snooze with text id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="text" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.exists(res.Fault, 'Text id should fault');
    });


    it('Sanity | Snooze recurring alarm', async () => {
        const acct = await makeAcct('alm');
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
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
							<alarm action="DISPLAY">
								<trigger>
									<rel neg="1" m="10"
										related="START"/>
								</trigger>
							</alarm>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
        );
        const calItemId = res.CreateAppointmentResponse.calItemId;
        const snoozeRes = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${calItemId}"
					until="${Date.now() + 600000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(
            snoozeRes.Fault, 'Recurring snooze should not fault'
        );
    });


    it('Sanity | Snooze then dismiss', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 15
        );
        await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        const dismissRes = await soap.makeSOAPEnvelopeAccount(
            `<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(
            dismissRes.Fault, 'Dismiss after snooze should not fault'
        );
    });


    it('Sanity | Snooze with negative id', async () => {
        const acct = await makeAcct('alm');
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="-1" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, 'Negative id should not fault');
    });


    it('Sanity | Snooze multiple alarms', async () => {
        const acct = await makeAcct('alm');
        const s1 = `Subj${common.getUniqueString()}`;
        const s2 = `Subj${common.getUniqueString()}`;
        const a1 = await createApptWithAlarm(
            acct.token, acct.email, s1, 15
        );
        const a2 = await createApptWithAlarm(
            acct.token, acct.email, s2, 10
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${a1.calItemId}"
					until="${Date.now() + 300000}"/>
				<appt id="${a2.calItemId}"
					until="${Date.now() + 600000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(
            res.Fault, 'Multiple snooze should not fault'
        );
    });


    it('Sanity | Snooze alarm 1 hour', async () => {
        const acct = await makeAcct('alm');
        const subject = `Subj${common.getUniqueString()}`;
        const appt = await createApptWithAlarm(
            acct.token, acct.email, subject, 30
        );
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 3600000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
        );
        assert.notExists(res.Fault, '1 hour snooze should not fault');
    });
});
