import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > CounterAppointment > CounterAppointmentRequest', function () {
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

	async function createMeeting(orgToken, orgEmail, invEmail, subj) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subj}" fb="B" transp="O">
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subj}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		return res.CreateAppointmentResponse;
	}

	it('Smoke | Verify attendee is able to Propose a new time', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Verify response
		assert.exists(appt.calItemId, 'Meeting should be created');
	});


	it('Sanity | Verify attendee is able to Propose a new Location', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Get appointment
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Get should not fault');
	});


	it('Sanity | Send CounterAppointmentRequest with time as blank - serviceINVALIDREQUEST', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		await createMeeting(
			org.token, org.email, inv.email, subject
		);
		const now = Date.now();

		// Search appointment
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, org.token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not fault');
	});


	it('Sanity | Send CounterAppointmentRequest with invalid time - serviceINVALIDREQUEST', async () => {
		// Create accounts
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;

		// Create meeting
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Get message
		const msgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, org.token
		);

		// Verify response
		assert.notExists(msgRes.Fault, 'GetMsg should not fault');
	});
});
