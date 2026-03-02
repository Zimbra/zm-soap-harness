import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Exceptions > Appointmentexception-Create', function () {
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

	async function createRecur(token, email, subject) {
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
			</CreateAppointmentRequest>`, token
		);
		return res.CreateAppointmentResponse;
	}


	
	it('Smoke | Create exception basic', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Verify response
		assert.exists(appt.calItemId, 'Recurring created');
	});


	it('Sanity | Create exception - get recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send get appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Get not fault');
	});


	it('Sanity | Create exception - search recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		await createRecur(acct.token, acct.email, s);
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
		assert.notExists(res.Fault, 'Search not fault');
	});


	it('Sanity | Create exception - modify instance', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} exception" fb="B"
							transp="O">
							<s d="${futureTime(86400000 + 3600000)}"/>
							<e d="${futureTime(86400000 + 7200000)}"/>
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
					<su>${s} exception</su>
					<mp ct="text/plain">
						<content>Exception</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Exception create not fault');
	});


	it('Sanity | Exception - verify after create', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send get appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Verify not fault');
	});


	it('Sanity | Exception - weekly recurring', async () => {
		const acct = await makeAcct('ex');
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
									<rule freq="WEE">
										<interval ival="1"/>
										<count num="4"/>
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
		assert.exists(
			res.CreateAppointmentResponse.calItemId,
			'Weekly recurring created'
		);
	});


	it('Sanity | Exception - monthly recurring', async () => {
		const acct = await makeAcct('ex');
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
									<rule freq="MON">
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
		assert.exists(
			res.CreateAppointmentResponse.calItemId,
			'Monthly recurring created'
		);
	});


	it('Sanity | Exception - F/B check', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		await createRecur(acct.token, acct.email, s);
		const now = Date.now();

		// Send get free busy request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				uid="${acct.email}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'F/B not fault');
	});


	it('Sanity | Exception - with invitee', async () => {
		const acct = await makeAcct('ex');
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
		assert.notExists(res.Fault, 'With invitee not fault');
	});


	it('Sanity | Exception - modify recurring subject', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

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

		// Verify response
		assert.notExists(res.Fault, 'Modify subj not fault');
	});


	it('Sanity | Exception - delete recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Delete not fault');
	});


	it('Sanity | Exception - search after delete', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Perform item action
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);
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
		assert.notExists(res.Fault, 'Search after del not fault');
	});


	it('Sanity | Exception - private recurring', async () => {
		const acct = await makeAcct('ex');
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


	it('Sanity | Exception - allday recurring', async () => {
		const acct = await makeAcct('ex');
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
							<s d="${dateStr}"/>
							<e d="${dateStr}"/>
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


	it('Sanity | Exception - with location', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O"
							loc="Room 202">
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
		assert.notExists(res.Fault, 'Location recur not fault');
	});


	it('Sanity | Exception - with alarm', async () => {
		const acct = await makeAcct('ex');
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
									<rel neg="1" m="10"
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
		assert.notExists(res.Fault, 'Alarm recur not fault');
	});


	it('Sanity | Exception - cancel recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

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
		assert.notExists(res.Fault, 'Cancel recur not fault');
	});


	it('Sanity | Exception - trash recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="trash" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Trash not fault');
	});


	it('Sanity | Exception - GetMsg recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Get the message
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetMsg not fault');
	});


	it('Sanity | Exception - flag recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="flag" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Flag not fault');
	});


	it('Sanity | Exception - interval 2 daily', async () => {
		const acct = await makeAcct('ex');
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


	it('Sanity | Exception - count 10 daily', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Verify response
		assert.exists(appt.calItemId, 'Count 10 created');
	});


	it('Sanity | Exception - two invitees recurring', async () => {
		const acct = await makeAcct('ex');
		const inv1 = await makeAcct('inv1');
		const inv2 = await makeAcct('inv2');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<at a="${inv1.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<at a="${inv2.email}" role="REQ"
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
					<e a="${inv1.email}" t="t"/>
					<e a="${inv2.email}" t="t"/>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Two invitees not fault');
	});


	it('Sanity | Exception - GetApptSummaries', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		await createRecur(acct.token, acct.email, s);
		const now = Date.now();

		// Send get appt summaries request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Summary not fault');
	});


	it('Sanity | Exception - MiniCal recurring', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		await createRecur(acct.token, acct.email, s);
		const now = Date.now();

		// Send get mini cal request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetMiniCalRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<folder id="10"/>
			</GetMiniCalRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'MiniCal not fault');
	});


	it('Sanity | Exception - modify recurring time', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
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
					<su>${s}</su>
					<mp ct="text/plain">
						<content>Time mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify time not fault');
	});


	it('Sanity | Exception - large count create', async () => {
		const acct = await makeAcct('ex');
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
										<count num="30"/>
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
		assert.exists(
			res.CreateAppointmentResponse.calItemId,
			'Large count created'
		);
	});


	it('Sanity | Exception - search wide range', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		await createRecur(acct.token, acct.email, s);
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
		assert.notExists(res.Fault, 'Wide search not fault');
	});


	it('Sanity | Exception - create yearly recurring', async () => {
		const acct = await makeAcct('ex');
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
									<rule freq="YEA">
										<interval ival="1"/>
										<count num="2"/>
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
		assert.exists(
			res.CreateAppointmentResponse.calItemId,
			'Yearly recurring created'
		);
	});


	it('Sanity | Exception - multiple recurring appts', async () => {
		const acct = await makeAcct('ex');
		const s1 = `Subj${common.getUniqueString()}`;
		const s2 = `Subj${common.getUniqueString()}`;
		const a1 = await createRecur(acct.token, acct.email, s1);
		const a2 = await createRecur(acct.token, acct.email, s2);

		// Verify response
		assert.exists(a1.calItemId, 'First created');
		assert.exists(a2.calItemId, 'Second created');
	});


	it('Sanity | Exception - modify count', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="10"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>Count mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify count not fault');
	});


	it('Sanity | Exception - verify after modify', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} new" fb="B" transp="O">
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
					<su>${s} new</su>
					<mp ct="text/plain">
						<content>New</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Send get appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Verify modify not fault');
	});


	it('Functional | Create exception - no OR tag', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send create appointment exception request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentExceptionRequest xmlns="urn:zimbraMail" id="${appt.invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${s} mod">
						<s d="${futureTime(3600000)}"/>
						<e d="${futureTime(7200000)}"/>
						<exceptId d="${futureTime(3600000)}"/>
					</inv>
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>No OR</content>
					</mp>
				</m>
			</CreateAppointmentExceptionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'No OR tag should not fault');
	});


	it('Functional | Create exception - non-recursive appt (bug 3848)', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;

		// Create an appointment
		const resAppt = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/><e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain"><content>C</content></mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);
		const invId = resAppt.CreateAppointmentResponse.invId;

		// Send create appointment exception request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentExceptionRequest xmlns="urn:zimbraMail" id="${invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${s} mod">
						<s d="${futureTime(86400000)}"/><e d="${futureTime(90000000)}"/>
						<or a="${acct.email}"/>
						<exceptId d="${futureTime(3600000)}"/>
					</inv>
					<su>${s} mod</su>
					<mp ct="text/plain"><content>E</content></mp>
				</m>
			</CreateAppointmentExceptionRequest>`, acct.token
		);

		// Verify response
		assert.exists(res.Fault, 'Should fault on non-recursive appt');
		assert.match(res.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'Correct fault code');
	});
});
