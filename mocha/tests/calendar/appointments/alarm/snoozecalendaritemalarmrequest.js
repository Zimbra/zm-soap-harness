import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Alarm > SnoozeCalendarItemAlarmRequest', function () {
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
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

	it('Smoke | Create Single event with reminder and snooze it', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;

		// Create appointment with alarm
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 15
		);

		// Snooze the alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Snooze should not fault');
	});


	it('Smoke | Create Single task with reminder and snooze it', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 10
		);

		// Snooze the alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with snooze until time as alphabets 1', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 15
		);

		// Snooze the alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 900000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with snooze until time as invalid time 1', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Snooze with invalid id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="99999" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Invalid id should not fault');
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with snooze until time as blank 1', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Snooze with blank id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.exists(res.Fault, 'Blank id should fault');
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with snooze until time as alphabets 2', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Snooze with text id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="text" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.exists(res.Fault, 'Text id should fault');
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with snooze until time as invalid time 2', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create recurring appointment with alarm
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

		// Snooze the alarm
		const snoozeRes = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${calItemId}"
					until="${Date.now() + 600000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(
			snoozeRes.Fault, 'Recurring snooze should not fault'
		);
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with snooze until time as blank 2', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 15
		);

		// Snooze the alarm
		await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Dismiss the alarm
		const dismissRes = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(
			dismissRes.Fault, 'Dismiss after snooze should not fault'
		);
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest - snooze until time with trailing Spaces', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Snooze with negative id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="-1" until="${Date.now() + 300000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Negative id should not fault');
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest - snooze until time with leading spaces', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const s1 = `Subj${common.getUniqueString()}`;
		const s2 = `Subj${common.getUniqueString()}`;
		const a1 = await createApptWithAlarm(
			acct.token, acct.email, s1, 15
		);
		const a2 = await createApptWithAlarm(
			acct.token, acct.email, s2, 10
		);

		// Snooze multiple alarms
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${a1.calItemId}"
					until="${Date.now() + 300000}"/>
				<appt id="${a2.calItemId}"
					until="${Date.now() + 600000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(
			res.Fault, 'Multiple snooze should not fault'
		);
	});


	it('Sanity | Send SnoozeCalendarItemAlarmRequest with space before and after the until time = 1603125000000 ', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 30
		);

		// Snooze the alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SnoozeCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					until="${Date.now() + 3600000}"/>
			</SnoozeCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, '1 hour snooze should not fault');
	});
});
