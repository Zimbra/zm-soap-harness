import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Get Appt Summaries > Search Appt Request', function () {
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

	async function createAppt(token, email, subject, t1, t2) {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
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

	it('Smoke | SearchRequest details', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | SearchRequest details with blank in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Search should not fault');
	});


	it('Regression | SearchRequest details with spaces in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		await soap.makeSOAPEnvelopeAccount(
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
			</CreateAppointmentRequest>`, acct.token
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 7 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Search recurring should not fault');
	});


	it('Regression | SearchRequest details with sometext in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>in:Calendar ${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Folder search should not fault');
	});


	it('Regression | SearchRequest details with special characters in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 86400000}">
				<query>nonexistent${common.getUniqueString()}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Empty search should not fault');
	});


	it('Regression | SearchRequest details with valid value in s attribute and blank e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Deleted search should not fault');
	});


	it('Regression | SearchRequest details with valid value in s attribute and spaces e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const s1 = `Subj${common.getUniqueString()}`;
		const s2 = `Subj${common.getUniqueString()}`;
		await createAppt(
			acct.token, acct.email, s1,
			futureTime(3600000), futureTime(7200000)
		);
		await createAppt(
			acct.token, acct.email, s2,
			futureTime(10800000), futureTime(14400000)
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Multi search should not fault');
	});


	it('Regression | SearchRequest details with valid in s attribute and sometext in e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O"
							class="PRI">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Private search should not fault');
	});


	it('Regression | SearchRequest details with valid value in s attribute and special characters in e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 90 * 86400000}"
				calExpandInstEnd="${now + 90 * 86400000}">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Wide range should not fault');
	});


	it('Regression | SearchRequest details with valid value in s attribute and e attribute with leading spaces', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const d = new Date(Date.now() + 86400000);
		const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="F" transp="O"
							allDay="1">
							<s d="${dateStr}"/><e d="${dateStr}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 3 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Allday search should not fault');
	});


	it('Regression | SearchRequest details with valid value in s attribute and e attribute with trailing spaces', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 86400000}"
				limit="5" offset="0">
				<query>is:anywhere</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Offset/limit should not fault');
	});


	it('Regression | SearchRequest details with valid value in s attribute and without e attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O">
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject} mod</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Modified search should not fault');
	});


	it('Regression | SearchRequest details with valid value in e attribute and without s attribute', async () => {
		// Create account
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		const now = Date.now();

		// Send SearchRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>subject:${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(
			res.Fault, 'Content search should not fault'
		);
	});
});
