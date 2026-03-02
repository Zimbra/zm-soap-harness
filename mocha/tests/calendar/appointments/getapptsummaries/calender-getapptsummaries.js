import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > GetApptSummaries > Calender-GetApptSummaries', function () {
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

	it('Smoke | Get appointment details', async () => {
		// Create account
		const acct = await makeAcct('gas');
		const now = Date.now();

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | Get appointment details with blank in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
		const subject = `Subj${common.getUniqueString()}`;
		await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		const now = Date.now();

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | Get appointment details with spaces in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
		const now = Date.now();

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 7 * 86400000}" e="${now - 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Past range should not fault');
	});


	it('Regression | Get appointment details with some text in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
		const now = Date.now();

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Future range should not fault');
	});


	it('Regression | Get appointment details with special characters in s attribute and valid e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
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

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Recurring should not fault');
	});


	it('Regression | Get appointment details with valid value in s attribute and blank in e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
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

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Multiple should not fault');
	});


	it('Regression | Get appointment details with valid value in s attribute and spaces in e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="" e="" l="10"/>`, acct.token
		);

		// Verify response
		assert.exists(res.Fault, 'Blank range should fault');
	});


	it('Regression | Get appointment details with valid value in s attribute and sometext in e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
		const now = Date.now();

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 90 * 86400000}"
				e="${now + 90 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Wide range should not fault');
	});


	it('Regression | Get appointment details with valid value in s attribute and special characters in e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
		const subject = `Subj${common.getUniqueString()}`;
		await createAppt(
			acct.token, acct.email, subject,
			futureTime(3600000), futureTime(7200000)
		);
		const now = Date.now();

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | Get appointment details with valid value in s and e attribute with leading spaces', async () => {
		// Create account
		const acct = await makeAcct('gas');
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

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 3 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Allday should not fault');
	});


	it('Regression | Get appointment details with valid value in s and e attribute with trailing spaces', async () => {
		// Create account
		const acct = await makeAcct('gas');
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

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'After delete should not fault');
	});


	it('Regression | Get appointment details with valid value in s and without e attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="text" e="text" l="10"/>`, acct.token
		);

		// Verify response
		assert.exists(res.Fault, 'Text range should fault');
	});


	it('Regression | Get appointment details with valid value in e and without s attribute', async () => {
		// Create account
		const acct = await makeAcct('gas');
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

		// Send GetApptSummariesRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 2 * 86400000}"
				l="10"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Private should not fault');
	});
});
