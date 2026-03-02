import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Exceptions > Appointmentexception-Cancel', function () {
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

	it('Smoke | Cancel exception basic', async () => {
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
		assert.notExists(res.Fault, 'Cancel not fault');
	});


	it('Sanity | Cancel recurring - verify', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send cancel appointment request
		await soap.makeSOAPEnvelopeAccount(
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
		assert.notExists(res.Fault, 'Search after cancel not fault');
	});


	it('Sanity | Cancel recurring with invitee', async () => {
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

		// Send cancel appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Cancel with inv not fault');
	});


	it('Sanity | Cancel recurring - delete after', async () => {
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


	it('Sanity | Cancel recurring weekly', async () => {
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

		// Send cancel appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Weekly cancel not fault');
	});


	it('Sanity | Cancel recurring and F/B', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send cancel appointment request
		await soap.makeSOAPEnvelopeAccount(
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
		const now = Date.now();

		// Send get free busy request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				uid="${acct.email}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'F/B after cancel not fault');
	});


	it('Sanity | Cancel recurring - trash', async () => {
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


	it('Sanity | Cancel recurring monthly', async () => {
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

		// Send cancel appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
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


	it('Sanity | Cancel recurring then recreate', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		// Send cancel appointment request
		await soap.makeSOAPEnvelopeAccount(
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
		const s2 = `Subj${common.getUniqueString()}`;
		const a2 = await createRecur(acct.token, acct.email, s2);

		// Verify response
		assert.exists(a2.calItemId, 'Recreated after cancel');
	});


	it('Sanity | Cancel recurring private', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
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
		const invId = create.CreateAppointmentResponse.invId;

		// Send cancel appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Private cancel not fault');
	});


	it('Sanity | Cancel and search empty', async () => {
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


	it('Functional | Cancel exception - invalid inst d', async () => {
		const acct = await makeAcct('ex');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecur(acct.token, acct.email, s);

		const invalidDates = ['', '	      ', 'some text', '//\\\\:\'\'*^%'];
		for (const d of invalidDates) {

			// Send cancel appointment request
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CancelAppointmentRequest xmlns="urn:zimbraMail" id="${appt.invId}" comp="0">
					<inst d="${d}"/>
					<m>
						<su>Cancelled ${s}</su>
						<mp ct="text/plain"><content>Cancel</content></mp>
					</m>
				</CancelAppointmentRequest>`, acct.token
			);

			// Verify response
			assert.exists(res.Fault, `Cancel with invalid date '${d}' should fault`);
			assert.match(res.Fault.Detail.Error.Code, /^service.INVALID_REQUEST/, 'Correct fault code');
		}
	});
});

