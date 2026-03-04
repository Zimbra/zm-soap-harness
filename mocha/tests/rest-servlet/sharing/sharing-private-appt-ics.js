import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Sharing > Sharing Private Appt ICS', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token, account1Id;
	let account2Email, account2Token;
	let calendarFolderId, mountpointName;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create accounts
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');
		const acct1 = create1Res.CreateAccountResponse?.account;
		account1Id = (Array.isArray(acct1) ? acct1[0] : acct1).id;

		// Create account
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
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Get calendar folder ID for account1
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const folders = folderRes.GetFolderResponse?.folder;
		const rootFolder = Array.isArray(folders) ? folders[0] : folders;
		const calFolder = rootFolder?.folder?.find?.(f => f.name === 'Calendar') || rootFolder?.folder?.[0];
		calendarFolderId = calFolder?.id;

		// Share calendar with account2 (manager rights)
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calendarFolderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Account2 creates mountpoint
		mountpointName = 'Calendar' + common.getUniqueString();

		// CreateMountpointRequest
		const mountRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountpointName}" view="appointment" rid="${calendarFolderId}" zid="${account1Id}"/>
			</CreateMountpointRequest>`, account2Token
		);

		// Verify response
		assert.notExists(mountRes.Fault, 'Response should not be a Fault');
		mountRes.CreateMountpointResponse?.link;
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
	it('Sanity | Verify Rest download of mounted calendar does not show private appointments', async () => {
		const apptSubject = 'subject' + common.getUniqueString();

		// Create private appointment as account1
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp class="PRI" method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${apptSubject}">
							<s d="20250119T120000Z"/>
							<e d="20250119T130000Z"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${apptSubject}</su>
					<e t="t" a="${account2Email}"/>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		// Account2 gets shared calendar via REST ICS
		const res = await rest.makeRestRequest(account2Token, {
			user: account2Email,
			folder: mountpointName,
			fmt: 'ics'
		});

		// Verify response
		assert.oneOf(res.status, [200, 204], 'REST GET should return 200 or 204');
		// Private appointment subject should NOT appear in ICS
		if (res.body && res.body.length > 0) {
			assert.notInclude(res.body, apptSubject, 'Private appointment subject should not be visible in shared ICS');
		}
	});


	it('Sanity | Verify Rest download of specific private appointment does not show all the data', async () => {
		const apptSubject = 'subject' + common.getUniqueString();
		const apptLocation = 'location' + common.getUniqueString();

		// Create private appointment as account1
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp class="PRI" method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${apptSubject}" loc="${apptLocation}">
							<s d="20250119T120000Z"/>
							<e d="20250119T130000Z"/>
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content/>
					</mp>
					<su>${apptSubject}</su>
					<e t="t" a="${account2Email}"/>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const appt = createRes.CreateAppointmentResponse;
		const invId = appt?.invId || appt?.calItemId;

		// Account2 gets specific appointment via REST ICS
		const res = await rest.makeRestRequest(account2Token, {
			user: account2Email,
			id: `${account1Id}:${invId}`,
			fmt: 'ics'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VCALENDAR', 'Should contain VCALENDAR');
		// Private data should not be visible
		assert.notInclude(res.body, apptSubject, 'Subject should not be visible for private appointment');
		assert.notInclude(res.body, apptLocation, 'Location should not be visible for private appointment');
	});
});
