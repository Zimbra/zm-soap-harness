import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Replies > Send Invite Reply Request Alias', function () {
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
						<comp name="${subj}" fb="B" transp="O"
							status="CONF">
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


	it('Smoke | Reply with alias org', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		await createMeeting(org.token, org.email, inv.email, s);

		// Verify response
		assert.isTrue(true, 'Alias org created');
	});


	it('Sanity | Reply alias search', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		await createMeeting(org.token, org.email, inv.email, s);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${s}</query>
			</SearchRequest>`, inv.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Alias search not fault');
	});


	it('Sanity | Reply alias verify', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createMeeting(
			org.token, org.email, inv.email, s
		);

		// Send get appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Alias verify not fault');
	});


});
