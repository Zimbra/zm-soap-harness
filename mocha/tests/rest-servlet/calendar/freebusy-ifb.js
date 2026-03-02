import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Calendar > Freebusy Ifb', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Token;
	let account2Email;
	let account3Email, account3Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		// Create account2
		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		// Create account3
		account3Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create3Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		await soap.getAccountAuthToken(account2Email);
		account3Token = await soap.getAccountAuthToken(account3Email);
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
	it('Sanity | Using the REST servlet, get the free busy for an account', async () => {
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account2Email
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'BEGIN:VFREEBUSY', 'Response should contain BEGIN:VFREEBUSY');
		assert.include(fbRes.body, 'END:VFREEBUSY', 'Response should contain END:VFREEBUSY');
	});


	it('Sanity | Get the free busy for an account without auth token', async () => {
		const fbRes = await rest.makeFreeBusyRequest(null, {
			acct: account2Email
		});

		// Verify response
		assert.include(fbRes.body, 'BEGIN:VFREEBUSY', 'Response should contain BEGIN:VFREEBUSY');
		assert.include(fbRes.body, 'END:VFREEBUSY', 'Response should contain END:VFREEBUSY');
	});


	it('Sanity | Get the free busy with start, end times', async () => {
		const startMs = '1326974400000';
		const endMs = String(Number(startMs) + 86400000);

		const fbRes = await rest.makeFreeBusyRequest(null, {
			acct: account2Email,
			s: startMs,
			e: endMs
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'DTSTART', 'Response should contain DTSTART');
		assert.include(fbRes.body, 'DTEND', 'Response should contain DTEND');
	});


	it('Sanity | Get the free busy with busy time', async () => {
		const startMs = '1358596800000';
		const subject = 'subject' + common.getUniqueString();

		// Create a busy appointment on account3
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY', 'Response should contain FBTYPE=BUSY');
	});


	it('Sanity | Get the free busy with tentative time', async () => {
		const startMs = '1390132800000';
		const subject = 'subject' + common.getUniqueString();

		// Create a tentative appointment on account3
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="T" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY-TENTATIVE', 'Response should contain FBTYPE=BUSY-TENTATIVE');
	});


	it('Sanity | Get the free busy with out-of-office time', async () => {
		const startMs = '1421668800000';
		const subject = 'subject' + common.getUniqueString();

		// Create an out-of-office appointment on account3
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="O" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY-UNAVAILABLE',
			'Response should contain FBTYPE=BUSY-UNAVAILABLE');
	});


	it('Sanity | Get the free busy with free time', async () => {
		const startMs = '1453204800000';
		const subject = 'subject' + common.getUniqueString();

		// Create a free appointment on account3
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="F" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbRes.body, 'FREEBUSY;FBTYPE=BUSY',
			'Response should not contain FREEBUSY;FBTYPE=BUSY for free appointment');
	});


	it('Sanity | Verify overlapping appointments (both busy) show as one block in F, B', async () => {
		const startMs = '1453204800000';
		const subject1 = 'subject' + common.getUniqueString();
		const subject2 = 'subject' + common.getUniqueString();
		const oneHourMs = 3600000;

		// Create first busy appointment (2 hours)
		const appt1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject1}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 2 * oneHourMs)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject1}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(appt1Res.Fault, 'Response should not be a Fault');

		// Create second busy appointment overlapping (starts 1h later, 2 hours)
		const appt2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject2}">
							<s d="${toIcalTime(Number(startMs) + oneHourMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3 * oneHourMs)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject2}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(appt2Res.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY', 'Response should contain FBTYPE=BUSY');
	});


	it('Sanity | Verify overlapping appointments (one busy and one tentative) show as two blocks (busy gets preference)', async () => {
		const startMs = '1266580800000';
		const subject1 = 'subject' + common.getUniqueString();
		const subject2 = 'subject' + common.getUniqueString();
		const oneHourMs = 3600000;

		// Create first busy appointment (2 hours)
		const appt1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject1}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 2 * oneHourMs)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject1}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(appt1Res.Fault, 'Response should not be a Fault');

		// Create second tentative appointment overlapping (starts 1h later, 2 hours)
		const appt2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="T" transp="O"
							allDay="0" name="${subject2}">
							<s d="${toIcalTime(Number(startMs) + oneHourMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3 * oneHourMs)}Z"/>
							<or a="${account3Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject2}</su>
				</m>
			</CreateAppointmentRequest>`, account3Token
		);

		// Verify response
		assert.notExists(appt2Res.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY', 'Response should contain FBTYPE=BUSY');
		assert.include(fbRes.body, 'FBTYPE=BUSY-TENTATIVE',
			'Response should contain FBTYPE=BUSY-TENTATIVE');
	});
});

/**
 * Convert milliseconds timestamp to iCalendar time format (YYYYMMDDTHHmmss)
 */
function toIcalTime(ms) {
	const d = new Date(Number(ms));
	const pad = (n) => String(n).padStart(2, '0');
	return d.getUTCFullYear() +
		pad(d.getUTCMonth() + 1) +
		pad(d.getUTCDate()) + 'T' +
		pad(d.getUTCHours()) +
		pad(d.getUTCMinutes()) +
		pad(d.getUTCSeconds());
}
