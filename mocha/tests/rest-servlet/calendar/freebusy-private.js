import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Calendar > Freebusy Private', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

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

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Sanity | Create a private event, verify F, B shows the block', async () => {
		const startMs = '1295438400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp class="PRI" method="REQUEST" type="event" fb="B"
							transp="O" allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account2Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account2Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY', 'F,B should show busy for private event');
	});


	it('Sanity | Create a public event, verify F, B shows the block', async () => {
		const startMs = '1326974400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp class="PUB" method="REQUEST" type="event" fb="B"
							transp="O" allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account2Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account2Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY', 'F,B should show busy for public event');
	});


	it('Sanity | Create a confidential event, verify F, B shows the block', async () => {
		const startMs = '1358596800000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp class="CON" method="REQUEST" type="event" fb="B"
							transp="O" allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account2Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account2Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await rest.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY',
			'F,B should show busy for confidential event');
	});
});

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
