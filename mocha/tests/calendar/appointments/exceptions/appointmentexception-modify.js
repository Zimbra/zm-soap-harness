import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Exceptions > Appointmentexception-Modify', function () {
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

	it('Smoke | Modify exception basic', async () => {
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
		assert.notExists(res.Fault, 'Modify not fault');
	});


	it('Sanity | Modify exception subject', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
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

		// Verify response
		assert.notExists(res.Fault, 'Modify subj not fault');
	});


	it('Sanity | Modify exception time', async () => {
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
						<content>Time</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify time not fault');
	});


	it('Sanity | Modify exception verify', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} v" fb="B" transp="O">
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
					<su>${s} v</su>
					<mp ct="text/plain">
						<content>V</content>
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
		assert.notExists(res.Fault, 'Verify not fault');
	});


	it('Sanity | Modify exception count', async () => {
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
						<content>Count</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify count not fault');
	});


	it('Sanity | Modify exception freq', async () => {
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
						<content>Freq</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify freq not fault');
	});


	it('Sanity | Modify exception search', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} srch" fb="B" transp="O">
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
					<su>${s} srch</su>
					<mp ct="text/plain">
						<content>S</content>
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
				<query>${s} srch</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify search not fault');
	});


	it('Sanity | Modify exception F/B', async () => {
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


	it('Sanity | Modify exception with invitee', async () => {
		const acct = await makeAcct('ex');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
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
		const invId = create.CreateAppointmentResponse.invId;

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
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
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify with inv not fault');
	});


	it('Sanity | Modify exception delete after', async () => {
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


	it('Sanity | Modify exception interval', async () => {
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
										<interval ival="2"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>Int</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify interval not fault');
	});


	it('Sanity | Modify exception location', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O"
							loc="Room 303">
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
					<su>${s}</su>
					<mp ct="text/plain">
						<content>Loc</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify loc not fault');
	});


	it('Sanity | Modify exception weekly', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
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
		const invId = create.CreateAppointmentResponse.invId;

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} wmod" fb="B" transp="O">
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
					<su>${s} wmod</su>
					<mp ct="text/plain">
						<content>WMod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Weekly modify not fault');
	});


	it('Sanity | Modify exception monthly', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
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
		const invId = create.CreateAppointmentResponse.invId;

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mmod" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
							<recur>
								<add>
									<rule freq="MON">
										<interval ival="1"/>
										<count num="2"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${s} mmod</su>
					<mp ct="text/plain">
						<content>MMod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Monthly modify not fault');
	});


	it('Sanity | Modify exception private', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O"
							class="PRI">
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
					<su>${s}</su>
					<mp ct="text/plain">
						<content>Pri</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify private not fault');
	});


	it('Sanity | Modify exception GetMsg', async () => {
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


	it('Sanity | Modify exception cancel after', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

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

		// Send cancel appointment request
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
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
		assert.notExists(
			cancelRes.Fault, 'Cancel after mod not fault'
		);
	});


	it('Sanity | Modify exception allday', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const d = new Date(Date.now() + 86400000);
		const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
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
		assert.exists(
			create.CreateAppointmentResponse.calItemId,
			'Allday recur created'
		);
	});


	it('Sanity | Modify exception GetRecur', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send get recur request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetRecur not fault');
	});


	it('Sanity | Modify exception summaries', async () => {
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
		assert.notExists(res.Fault, 'Summaries not fault');
	});


	it('Sanity | Modify exception trash', async () => {
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


	it('Sanity | Modify exception flag', async () => {
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


	it('Sanity | Modify exception add alarm', async () => {
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
										<count num="5"/>
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
						<content>Alarm</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Add alarm not fault');
	});


	it('Sanity | Modify exception MiniCal', async () => {
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


	it('Sanity | Modify exception multiple mods', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} m1" fb="B" transp="O">
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
					<su>${s} m1</su>
					<mp ct="text/plain">
						<content>M1</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} m2" fb="B" transp="O">
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
					<su>${s} m2</su>
					<mp ct="text/plain">
						<content>M2</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Double mod not fault');
	});


	it('Functional | Modify exception - no subject tag (bug 4480)', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${appt.invId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" loc="Room">
						<s d="${futureTime(3600000)}"/>
						<e d="${futureTime(7200000)}"/>
						<or a="${acct.email}"/>
					</inv>
					<mp ct="text/plain">
						<content>No subject</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modify with no subject should not fault');
	});
});

