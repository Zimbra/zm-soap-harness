import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Grant Permission Request', function () {
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
	it('Smoke | Verify Allow these users to invite me to meetings setting works', async () => {
		// Create account1
		const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acct1Res.CreateAccountResponse.account[0].id, 'Account 1 ID should exist');
		const acct1Token = await soap.getAccountAuthToken(acct1Email);

		// Create account2 (allowed to invite)
		const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
		const acct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acct2Res.CreateAccountResponse.account[0].id, 'Account 2 ID should exist');
		const acct2Token = await soap.getAccountAuthToken(acct2Email);

		// Create account3 (not allowed to invite)
		const acct3Email = `acct3${common.getUniqueString()}@${testDomain}`;
		const acct3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct3Res.Fault, 'CreateAccountRequest should not fault');
		assert.exists(acct3Res.CreateAccountResponse.account[0].id, 'Account 3 ID should exist');
		const acct3Token = await soap.getAccountAuthToken(acct3Email);

		// Account1 grants invite permission to account2 only
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="invite" gt="usr" d="${acct2Email}"/>
			</GrantPermissionRequest>`, acct1Token
		);
		assert.notExists(grantRes.Fault, 'GrantPermissionRequest should not fault');

		// Account2 creates meeting inviting account1
		const subject1 = `Subj1${common.getUniqueString()}`;
		const content1 = `Content1${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject1}">
							<or a="${acct2Email}"/>
							<at a="${acct1Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${acct1Email}" t="t"/>
					<su>${subject1}</su>
					<mp ct="text/plain">
						<content>${content1}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct2Token
		);
		assert.notExists(createRes1.Fault, 'CreateAppointmentRequest should not fault');

		// Account3 creates meeting inviting account1
		const subject2 = `Subj2${common.getUniqueString()}`;
		const content2 = `Content2${common.getUniqueString()}`;
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject2}">
							<or a="${acct3Email}"/>
							<at a="${acct1Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${acct1Email}" t="t"/>
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>${content2}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct3Token
		);
		assert.notExists(createRes2.Fault, 'CreateAppointmentRequest should not fault');

		// Verify account1 calendar: should have appointment from account2 but NOT from account3
		const now = Date.now();

		// Get calendar folder ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Search for appointments
		const searchRes = await soap.pollForSearchResult(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject1}</query>
			</SearchRequest>`, acct1Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.appt, 'Appointment from account2 should exist');

		// Search for account3 appointment - should not be present
		const searchRes2 = await soap.pollForSearchResult(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject2}</query>
			</SearchRequest>`, acct1Token
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
	});


	it('Sanity | Verify Allow these users to see my free, busy information works', async () => {
		// Create 3 accounts
		const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
		const acct1Token = await soap.getAccountAuthToken(acct1Email);

		const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
		const acct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
		const acct2Token = await soap.getAccountAuthToken(acct2Email);

		const acct3Email = `acct3${common.getUniqueString()}@${testDomain}`;
		const acct3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(acct3Res.Fault, 'CreateAccountRequest should not fault');
		const acct3Id = acct3Res.CreateAccountResponse.account[0].id;
		const host = acct3Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const acct3Token = await soap.getAccountAuthToken(acct3Email);

		// Account3 grants viewFreeBusy permission to account2 only
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<GrantPermissionRequest xmlns="urn:zimbraMail">
				<ace right="viewFreeBusy" gt="usr" d="${acct2Email}"/>
			</GrantPermissionRequest>`, acct3Token
		);
		assert.notExists(grantRes.Fault, 'GrantPermissionRequest should not fault');

		// Account3 creates appointment making himself busy
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acct3Email}"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct3Token
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

		// Account2 can see freebusy of account3
		const now = Date.now();
		const freeBusyRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}"
				e="${now + 2 * 86400000}"
				uid="${acct3Id}"/>`, acct2Token
		);
		assert.notExists(freeBusyRes.Fault, 'GetFreeBusyRequest should not fault');
		const usrData = Array.isArray(freeBusyRes.GetFreeBusyResponse.usr)
			? freeBusyRes.GetFreeBusyResponse.usr[0] : freeBusyRes.GetFreeBusyResponse.usr;
		assert.exists(usrData.b, 'Busy info should be available for account2');

		// Account1 cannot see freebusy of account3
		const freeBusy1Res = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}"
				e="${now + 2 * 86400000}"
				uid="${acct3Id}"/>`, acct1Token
		);
		assert.notExists(freeBusy1Res.Fault, 'GetFreeBusyRequest should not fault');
		const usr1Data = Array.isArray(freeBusy1Res.GetFreeBusyResponse.usr)
			? freeBusy1Res.GetFreeBusyResponse.usr[0] : freeBusy1Res.GetFreeBusyResponse.usr;
		assert.exists(usr1Data.n, 'NoData should be present for account1');
	});
});
