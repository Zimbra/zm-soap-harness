import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Calendar > FreeBusy Exclude', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create an appointment in a folder that is included in F, B, verify F, B shows the block', async () => {
		// Get root folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const rootId = rootFolder.id;

		// Create calendar folder
		const folderName = 'calendar' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Create appointment in the folder
		const startMs = '1263902400000';
		const subject = 'subject' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
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
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await soap.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY', 'Response should contain FBTYPE=BUSY');
	});


	it('Sanity | Create an appointment in a folder that is excluded in F, B, verify F, B shows the block', async () => {
		// Get root folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const rootId = rootFolder.id;

		// Create calendar folder with exclude flag (f="b")
		const folderName = 'calendar' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" f="b" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Create appointment in excluded folder
		const startMs = '1295438400000';
		const subject = 'subject' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
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
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await soap.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		// Excluded folder should NOT show busy time
		assert.notInclude(fbRes.body, toIcalTime(startMs),
			'Excluded folder should not appear in FreeBusy');
	});


	it('Sanity | Exclude a folder from F, B, verify F, B shows the block 1', async () => {
		// Get root folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const rootId = rootFolder.id;

		// Create calendar folder (included)
		const folderName = 'calendar' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Create appointment
		const startMs = '1266580800000';
		const subject = 'subject' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
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
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		// Now exclude the folder from FreeBusy
		const excludeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="fb" id="${folderId}" excludeFreeBusy="1"/>
			</FolderActionRequest>`, account2Token
		);
		assert.notExists(excludeRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await soap.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		// Excluded folder should NOT show busy time
		assert.notInclude(fbRes.body, toIcalTime(startMs),
			'Excluded folder should not appear in FreeBusy');
	});


	it('Sanity | Exclude a folder from F, B, verify F, B shows the block 2', async () => {
		// Get root folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const rootId = rootFolder.id;

		// Create calendar folder with exclude flag
		const folderName = 'calendar' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" f="b" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		const folderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0].id
			: createFolderRes.CreateFolderResponse.folder.id;

		// Create appointment
		const startMs = '1298116800000';
		const subject = 'subject' + common.getUniqueString();
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
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
		assert.notExists(apptRes.Fault, 'Response should not be a Fault');

		// Re-include the folder in FreeBusy
		const includeRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="fb" id="${folderId}" excludeFreeBusy="0"/>
			</FolderActionRequest>`, account2Token
		);
		assert.notExists(includeRes.Fault, 'Response should not be a Fault');

		const oneDayMs = 86400000;
		const fbRes = await soap.makeFreeBusyRequest(account1Token, {
			acct: account2Email,
			s: String(Number(startMs) - oneDayMs),
			e: String(Number(startMs) + oneDayMs)
		});
		assert.equal(fbRes.status, 200, 'FreeBusy should return 200');
		assert.include(fbRes.body, 'FBTYPE=BUSY',
			'Re-included folder should show busy time in FreeBusy');
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
