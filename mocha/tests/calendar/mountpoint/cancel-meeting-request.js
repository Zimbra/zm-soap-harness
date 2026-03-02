import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Mountpoint > Cancel Meeting Request', function () {
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


	it('Sanity | Cancel meeting in shared calendar', async () => {
		const owner = await makeAcct('own');
		const sharee = await makeAcct('shr');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create appointment
		const appt = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${owner.email}"/>
							<at a="${sharee.email}" role="REQ"
								ptst="NE" rsvp="1"/>
						</comp>
					</inv>
					<e a="${sharee.email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, owner.token
		);
		const invId = appt.CreateAppointmentResponse.invId;

		// Cancel
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<e a="${sharee.email}" t="t"/>
					<su>Cancelled: ${subject}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, owner.token
		);
		assert.notExists(cancelRes.Fault, 'Cancel should not fault');
	});


	it('Sanity | Cancel meeting and verify removal', async () => {
		const owner = await makeAcct('own');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		const appt = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${owner.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, owner.token
		);
		const calItemId = appt.CreateAppointmentResponse.calItemId;

		// Delete
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${calItemId}"/>
			</ItemActionRequest>`, owner.token
		);

		// Verify deleted
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${calItemId}"/>`, owner.token
		);
		assert.exists(getRes.Fault, 'Deleted appt should fault');
	});
});
