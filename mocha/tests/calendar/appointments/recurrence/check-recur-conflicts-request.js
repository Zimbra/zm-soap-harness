import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Recurrence > Check Recur Conflicts Request', function () {
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

	it('Smoke | Verify user can check conflicts in recurrence against list of users 1', async () => {
		// Create accounts
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'DAI', 3);
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Conflicts should not fault');
	});


	it('Sanity | Verify user can check conflicts in recurrence against list of users 2', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'No appts conflict not fault');
	});


	it('Sanity | Verify user can check conflicts in recurrence against list of users 3', async () => {
		// Create accounts
		const a1 = await makeAcct('rec1');
		const a2 = await makeAcct('rec2');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(a1.token, a1.email, s, 'DAI', 3);
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${a1.email}"/>
				<usr name="${a2.email}"/>
			</CheckRecurConflictsRequest>`, a1.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Two user not fault');
	});


	it('Sanity | Verify user can check conflicts in recurrence against list of users 4', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 90 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Wide range not fault');
	});


	it('Sanity | Send CheckRecurConflictsRequest with invalid start and end time', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'WEE', 4);
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Weekly conflict not fault');
	});


	it('Sanity | Send CheckRecurConflictsRequest with start and end time as alphabets', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		await createRecurAppt(acct.token, acct.email, s, 'MON', 3);
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 90 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Monthly conflict not fault');
	});


	it('Sanity | Send CheckRecurConflictsRequest with blank start and end time', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now - 30 * 86400000}" e="${now}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Past range not fault');
	});


	it('Sanity | Send CheckRecurConflictsRequest with blank exceptId', async () => {
		// Create account
		const acct = await makeAcct('rec');
		await createRecurAppt(
			acct.token, acct.email,
			`S${common.getUniqueString()}`, 'DAI', 3
		);
		await createRecurAppt(
			acct.token, acct.email,
			`S${common.getUniqueString()}`, 'WEE', 4
		);
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 30 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Multiple not fault');
	});


	it('Sanity | Send CheckRecurConflictsRequest with invalid value for exceptId', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 3
		);

		// Perform item action
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${appt.calItemId}"/>
			</ItemActionRequest>`, acct.token
		);
		const now = Date.now();

		// Send check recur conflicts request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CheckRecurConflictsRequest xmlns="urn:zimbraMail"
				s="${now}" e="${now + 7 * 86400000}">
				<usr name="${acct.email}"/>
			</CheckRecurConflictsRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'After delete not fault');
	});
});
