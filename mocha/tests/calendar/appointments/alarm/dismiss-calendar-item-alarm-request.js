import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Alarm > Dismiss Calendar Item Alarm Request', function () {
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

	it('Smoke | Create Single event with reminder and dismiss it', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;

		// Create appointment with alarm
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 15
		);

		// Dismiss the alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Dismiss should not fault');
	});


	it('Smoke | Create Single task and dismiss it', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 10
		);

		// Dismiss the alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest with dismissedAt time as alphabets', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Dismiss with invalid id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="99999" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Invalid id should not fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest with dismissedAt time as invalid time', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 5
		);

		// Dismiss the alarm
		await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify via get
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Get should not fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest with dismissedAt time as blank', async () => {
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

		// Dismiss multiple alarms
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${a1.calItemId}"
					dismissedAt="${Date.now()}"/>
				<appt id="${a2.calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Multiple dismiss should not fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest with invalid appt ID', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Dismiss with blank id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Blank id should fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest: dismissedAt time with leading Spaces - dismissedAt= 1603125000000', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Dismiss with text id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="sometext" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.isString(res.Fault.Detail.Error.Code, 'Text id should fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest: dismissedAt time with trailing Spaces - dismissedAt=1603125000000 ', async () => {
		// Create account
		const acct = await makeAcct('alm');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createApptWithAlarm(
			acct.token, acct.email, subject, 30
		);
		const now = Date.now();

		// Dismiss specific alarm
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${appt.calItemId}"
					dismissedAt="${now}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest with space before and after the dismissedAt time = 1603125000000 ', async () => {
		// Create account
		const acct = await makeAcct('alm');

		// Dismiss with negative id
		const res = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="-1" dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Negative id should not fault');
	});


	it('Sanity | Send DismissCalendarItemAlarmRequest with blank ID', async () => {
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

		// Dismiss the alarm
		const dismissRes = await soap.makeSOAPEnvelopeAccount(
			`<DismissCalendarItemAlarmRequest xmlns="urn:zimbraMail">
				<appt id="${calItemId}"
					dismissedAt="${Date.now()}"/>
			</DismissCalendarItemAlarmRequest>`, acct.token
		);

		// Verify response
		assert.notExists(
			dismissRes.Fault, 'Recurring dismiss should not fault'
		);
	});
});
