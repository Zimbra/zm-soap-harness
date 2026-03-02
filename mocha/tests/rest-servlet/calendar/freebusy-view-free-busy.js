import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Calendar > Freebusy View Free Busy', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountAEmail, accountAToken;
	let accountBEmail, accountBToken;
	let account1Email, account1Token;
	let account2Email, account2Token;
	let account3Email, account3Token;
	let account4Email, account4Token;
	let account5Email, account5Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const createAcct = async (label) => {
			const email = 'test' + common.getUniqueString() + '@' + config.testDomain;

			// Create account
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(res.Fault, `Create ${label} should not fault`);
			const token = await soap.getAccountAuthToken(email);
			return { email, token };
		};

		const acctA = await createAcct('accountA');
		accountAEmail = acctA.email; accountAToken = acctA.token;

		const acctB = await createAcct('accountB');
		accountBEmail = acctB.email; accountBToken = acctB.token;

		const acct1 = await createAcct('account1');
		account1Email = acct1.email; account1Token = acct1.token;

		const acct2 = await createAcct('account2');
		account2Email = acct2.email; account2Token = acct2.token;

		const acct3 = await createAcct('account3');
		account3Email = acct3.email; account3Token = acct3.token;

		const acct4 = await createAcct('account4');
		account4Email = acct4.email; account4Token = acct4.token;

		const acct5 = await createAcct('account5');
		account5Email = acct5.email; account5Token = acct5.token;
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
	it('Sanity | Verify if viewFreeBusy all, only internal users are allowed F, B access', async () => {
		// Revoke public viewFreeBusy, then grant to all
		await soap.makeSOAPEnvelopeAccount(
			`<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="pub" zid="99999999-9999-9999-9999-999999999999"/>
			</RevokePermissionRequest>`, account1Token
		);

		// GrantPermissionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="all"/>
			</GrantPermissionRequest>`, account1Token
		);

		// Create busy appointment
		const startMs = '1263902400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;

		// Non-authenticated user should NOT see FreeBusy (gt=all means internal only)
		const fbPublic = await rest.makeFreeBusyRequest(null, {
			acct: account1Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbPublic.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbPublic.body, toIcalTime(startMs),
			'Non-authenticated user should not see busy time with gt=all');

		// Internal user SHOULD see FreeBusy
		const fbInternal = await rest.makeFreeBusyRequest(accountAToken, {
			acct: account1Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbInternal.status, 200, 'FreeBusy should return 200');
		assert.include(fbInternal.body, 'FBTYPE=BUSY',
			'Internal user should see busy time with gt=all');
	});


	it('Sanity | Verify if viewFreeBusy pub, all users are allowed F, B access', async () => {
		// Revoke public viewFreeBusy, then grant to pub
		await soap.makeSOAPEnvelopeAccount(
			`<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="pub" zid="99999999-9999-9999-9999-999999999999"/>
			</RevokePermissionRequest>`, account2Token
		);

		// GrantPermissionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="pub"/>
			</GrantPermissionRequest>`, account2Token
		);

		const startMs = '1295438400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
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

		// Non-authenticated user SHOULD see FreeBusy (gt=pub)
		const fbPublic = await rest.makeFreeBusyRequest(null, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbPublic.status, 200, 'FreeBusy should return 200');
		assert.include(fbPublic.body, 'FBTYPE=BUSY',
			'Non-authenticated user should see busy time with gt=pub');

		// Internal user SHOULD also see FreeBusy
		const fbInternal = await rest.makeFreeBusyRequest(accountAToken, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbInternal.status, 200, 'FreeBusy should return 200');
		assert.include(fbInternal.body, 'FBTYPE=BUSY',
			'Internal user should see busy time with gt=pub');
	});


	it('Sanity | Verify if viewFreeBusy all, deny 1, all users are allowed F, B access', async () => {
		// Revoke public viewFreeBusy, then deny all
		await soap.makeSOAPEnvelopeAccount(
			`<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="pub" zid="99999999-9999-9999-9999-999999999999"/>
			</RevokePermissionRequest>`, account3Token
		);

		// GrantPermissionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="all" deny="1"/>
			</GrantPermissionRequest>`, account3Token
		);

		const startMs = '1295438400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
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

		// Non-authenticated should NOT see (deny=1)
		const fbPublic = await rest.makeFreeBusyRequest(null, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbPublic.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbPublic.body, toIcalTime(startMs),
			'Non-authenticated user should not see busy time with deny=1');

		// Internal user also should NOT see (deny=1 for all)
		const fbInternal = await rest.makeFreeBusyRequest(accountAToken, {
			acct: account3Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbInternal.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbInternal.body, toIcalTime(startMs),
			'Internal user should not see busy time with deny=1 for all');
	});


	it('Sanity | Verify if viewFreeBusy usr, only specified users are allowed F, B access', async () => {
		// Revoke public viewFreeBusy, then grant to specific user
		await soap.makeSOAPEnvelopeAccount(
			`<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="pub" zid="99999999-9999-9999-9999-999999999999"/>
			</RevokePermissionRequest>`, account4Token
		);

		// GrantPermissionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="usr" d="${accountAEmail}"/>
			</GrantPermissionRequest>`, account4Token
		);

		const startMs = '1295438400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account4Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account4Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;

		// Non-authenticated should NOT see
		const fbPublic = await rest.makeFreeBusyRequest(null, {
			acct: account4Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbPublic.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbPublic.body, toIcalTime(startMs),
			'Non-authenticated user should not see busy time with gt=usr');

		// Specified user (accountA) SHOULD see
		const fbAllowed = await rest.makeFreeBusyRequest(accountAToken, {
			acct: account4Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbAllowed.status, 200, 'FreeBusy should return 200');
		assert.include(fbAllowed.body, 'FBTYPE=BUSY',
			'Specified user should see busy time');

		// Non-specified user (accountB) should NOT see
		const fbDenied = await rest.makeFreeBusyRequest(accountBToken, {
			acct: account4Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbDenied.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbDenied.body, toIcalTime(startMs),
			'Non-specified user should not see busy time');
	});


	it('Sanity | Verify if viewFreeBusy usr (multiple users), only specified users are allowed F, B access', async () => {
		// Revoke public viewFreeBusy, then grant to multiple specific users
		await soap.makeSOAPEnvelopeAccount(
			`<RevokePermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="pub" zid="99999999-9999-9999-9999-999999999999"/>
			</RevokePermissionRequest>`, account5Token
		);

		// GrantPermissionRequest
		await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="usr" d="${accountAEmail}"/>
				<ace right="viewFreeBusy" gt="usr" d="${accountBEmail}"/>
			</GrantPermissionRequest>`, account5Token
		);

		const startMs = '1295438400000';
		const subject = 'subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${toIcalTime(startMs)}Z"/>
							<e d="${toIcalTime(Number(startMs) + 3600000)}Z"/>
							<or a="${account5Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account5Token
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;

		// Non-authenticated should NOT see
		const fbPublic = await rest.makeFreeBusyRequest(null, {
			acct: account5Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbPublic.status, 200, 'FreeBusy should return 200');
		assert.notInclude(fbPublic.body, toIcalTime(startMs),
			'Non-authenticated user should not see busy time');

		// AccountA SHOULD see
		const fbA = await rest.makeFreeBusyRequest(accountAToken, {
			acct: account5Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbA.status, 200, 'FreeBusy should return 200');
		assert.include(fbA.body, 'FBTYPE=BUSY',
			'AccountA should see busy time');

		// AccountB SHOULD see
		const fbB = await rest.makeFreeBusyRequest(accountBToken, {
			acct: account5Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});

		// Verify response
		assert.equal(fbB.status, 200, 'FreeBusy should return 200');
		assert.include(fbB.body, 'FBTYPE=BUSY',
			'AccountB should see busy time');
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
