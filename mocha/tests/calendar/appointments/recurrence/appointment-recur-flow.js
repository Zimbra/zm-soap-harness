import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Recurrence > Appointment Recur Flow', function () {
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
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
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

	it('Smoke | Create an recurring appointment of every day with no end date and check that account2 has received the appointment request', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;

		// Create a recurring appointment
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Verify response
		assert.exists(appt.calItemId, 'Should be created');
	});


	it('Sanity | Create an recurring appointment of every day with End after 5 occurence and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Send get appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Get should not fault');
	});


	it('Sanity | Create an recurring appointment of every day with given End by date and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'DAI', 5);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Search should not fault');
	});


	it('Smoke | Create an recurring appointment of every week day with No End date and check that account2 received the appointment request', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'WEE', 4
		);

		// Verify response
		assert.exists(appt.calItemId, 'Weekly created');
	});


	it('Sanity | Create an recurring appointment of every week day with End after 7 occurance and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'MON', 3
		);

		// Verify response
		assert.exists(appt.calItemId, 'Monthly created');
	});


	it('Sanity | Create an recurring appointment of every week day with End By Date and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'YEA', 2
		);

		// Verify response
		assert.exists(appt.calItemId, 'Yearly created');
	});


	it('Sanity | Create an recurring appointment of every 4th day with no end date and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Modify the appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Modify should not fault');
	});


	it('Sanity | Create an recurring appointment of every 4th day with End after 5 occurence and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Send cancel appointment request
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

		// Verify response
		assert.notExists(res.Fault, 'Cancel should not fault');
	});


	it('Sanity | Create an recurring appointment of every 4th day with End By Date and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Delete should not fault');
	});


	it('Sanity | Create an appointment every wednesday with no end date and check that account2 has received the appointment request', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'WEE', 4);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 30 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Weekly search not fault');
	});


	it('Sanity | Create an appointment every wednesday with End after 5 occurrences and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'MON', 3);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 90 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Monthly search not fault');
	});


	it('Sanity | Create an appointment every Thursday with given End by date and check that account2 received the appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Recurring with inv not fault');
	});


	it('Sanity | Create an appointment every 3 weeks on all (7) days with no End date and check that account2 has received the correct appointment request', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'DAI', 3);
		const now = Date.now();

		// Send get free busy request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				uid="${acct.email}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'F/B should not fault');
	});


	it('Sanity | Create an appointment every 3 weeks on two days with no End date and check that account2 has received the correct appointment request', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 10
		);

		// Verify response
		assert.exists(appt.calItemId, 'Count 10 created');
	});


	it('Sanity | Create an appointment every 3 weeks on two days with End after 5 occurence and check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Interval 2 not fault');
	});


	it('Sanity | Create an appointment every 3 weeks on two days with End by date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'WEE', 4
		);

		// Modify the appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Weekly modify not fault');
	});


	it('Sanity | Create an appointment on day 20th of every 2nd month with no End date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'MON', 3
		);

		// Send cancel appointment request
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

		// Verify response
		assert.notExists(res.Fault, 'Monthly cancel not fault');
	});


	it('Sanity | Create an appointment on day 20th of every 2nd month with End after 2 occurrence, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'YEA', 2
		);

		// Send get appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Yearly get not fault');
	});


	it('Sanity | Create an appointment on day 20th of every 2nd month with End by given date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const d = new Date(Date.now() + 86400000);
		const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

		// Create an appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Allday recur not fault');
	});


	it('Sanity | Create an appointment on the 2nd tuesday of every 2nd month with No End date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Private recur not fault');
	});


	it('Sanity | Create an appointment on the 2nd tuesday of every 2nd month with end after 5 occurence, check that account2 received the correct appointment request. 1', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Recur with alarm not fault');
	});


	it('Sanity | Create an appointment on the 2nd tuesday of every 2nd month with end after 5 occurence, check that account2 received the correct appointment request. 2', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
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

		// Verify response
		assert.notExists(res.Fault, 'Location recur not fault');
	});


	it('Sanity | Create an appointment on 6th march of every year with no end date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 3
		);

		// Get the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetMsg not fault');
	});


	it('Sanity | Create an appointment on 6th march of every year with end after 5 occurrence, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'WEE', 52
		);

		// Verify response
		assert.exists(appt.calItemId, 'Large count created');
	});


	it('Sanity | Create an appointment on 6th march of every year with end by given date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 3
		);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="trash" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Trash should not fault');
	});


	it('Sanity | Create an appointment on the first monday of march of every year with end by given date, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 3
		);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Flag should not fault');
	});


	it('Sanity | Create an appointment on the first monday of march of every year with end after 5 occurrence, check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 3
		);

		// Modify the appointment
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

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s} mod</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Search after mod not fault');
	});


	it('Sanity | Create an appointment on the first monday of march of every year with no end date3/3/2006 check that account2 received the correct appointment request.', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'YEA', 2);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 3 * 365 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Yearly search not fault');
	});
});
