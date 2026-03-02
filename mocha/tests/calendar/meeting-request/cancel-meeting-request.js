import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Cancel Meeting Request', function () {
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
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const id = res.CreateAccountResponse.account[0].id;
		const token = await soap.getAccountAuthToken(email);
		return { email, id, token };
	}

	async function createMeeting(orgToken, orgEmail, inviteeEmail, subject) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${orgEmail}"/>
							<at a="${inviteeEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${inviteeEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		return res.CreateAppointmentResponse;
	}
	it('Sanity | Cancel meeting request with message', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Send cancel appointment request
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancellation notice</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(
			cancelRes.Fault,
			'Cancel with message should not fault'
		);
	});


	it('Sanity | Cancel meeting and delete from calendar', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Send cancel appointment request
		await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
		);

		// Perform item action
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, org.token
		);

		// Verify response
		assert.notExists(
			delRes.Fault,
			'Delete should not fault'
		);
	});
});
