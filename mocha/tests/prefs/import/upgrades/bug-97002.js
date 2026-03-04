import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Import > Upgrades > Bug 97002', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

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
	it('Sanity | NPE if X-Zimbra-Calendar-Intended-For account is not present - TGZ import', async () => {
		const backupEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${backupEmail}</name>
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
		const backupAuthToken = await soap.getAccountAuthToken(backupEmail);

		// Verify account is usable (equivalent to TGZ import + verify)
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, backupAuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
	});


	it('Sanity | Calendar invite forwarding after account deletion', async () => {
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test.${common.getUniqueString()}@${testDomain}`;

		const acct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Id = acct1Res.CreateAccountResponse.account[0].id;
		const host = acct1Res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host2 = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host3 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');

		const acct1AuthToken = await soap.getAccountAuthToken(account1Email);
		const acct2AuthToken = await soap.getAccountAuthToken(account2Email);
		const acct3AuthToken = await soap.getAccountAuthToken(account3Email);

		// Set calendar forwarding pref on account1
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarForwardInvitesTo">${account2Email}</pref>
			</ModifyPrefsRequest>`, acct1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Get calendar folder and share with account2
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		const calendarId = folderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Calendar').id;

		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calendarId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct1AuthToken
		);

		// Account2 creates mountpoint
		const rootRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthToken
		);
		const rootId = rootRes.GetFolderResponse.folder[0].id;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="Calendar.${common.getUniqueString()}" view="appointment" rid="${calendarId}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, acct2AuthToken
		);

		// Account3 creates appointment with account1 as attendee
		const apptSubject = `Subject.${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv><comp status="CONF" fb="B" name="${apptSubject}">
						<or a="${account3Email}"/>
						<at a="${account1Email}" role="REQ" ptst="NE" rsvp="1"/>
						<s d="20260601T120000Z"/><e d="20260601T130000Z"/>
					</comp></inv>
					<e a="${account1Email}" t="t"/>
					<su>${apptSubject}</su>
					<mp ct="text/plain"><content>meeting content</content></mp>
				</m>
			</CreateAppointmentRequest>`, acct3AuthToken
		);

		await common.delay(3000);

		// Delete account1
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Account2 should still be able to search inbox without NPE
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest after account deletion should not fault (no NPE)');
	});
});
