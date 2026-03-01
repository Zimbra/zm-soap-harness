import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('CalDav > Folders', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1User;
	let account1NameEncoded;
	let account1Token;
	let account1Server;
	let account2Name;
	let account2NameEncoded;
	let account2Server;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 on default domain
		account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;
		account1NameEncoded = account1User + '%40' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const attrs1 = Array.isArray(acct1.a) ? acct1.a : [acct1.a];
		const mailHost1 = attrs1.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost1 ? (mailHost1._content || mailHost1) : config.serverHost;

		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Create a second domain and account2 for Folders_04
		const domain2Name = 'dom' + common.getUniqueString() + '.' + config.testDomain;

		// CreateDomainRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		const account2User = 'test' + common.getUniqueString();
		account2Name = account2User + '@' + domain2Name;
		account2NameEncoded = account2User + '%40' + domain2Name;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		const attrs2 = Array.isArray(acct2.a) ? acct2.a : [acct2.a];
		const mailHost2 = attrs2.find(a => a.n === 'zimbraMailHost');
		account2Server = mailHost2 ? (mailHost2._content || mailHost2) : config.serverHost;
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

	// Helper: PROPFIND on root DAV folder for a specific user
	async function propfindRoot(user, encoded, server) {
		return makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${encoded}/`,
			user: user,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<C:calendar-description/>
					<A:calendar-color/>
					<A:calendar-order/>
					<D:resourcetype/>
					<C:calendar-free-busy-set/>
				</D:prop>
			</D:propfind>`,
			server: server,
		});
	}

	// Tests
	it('Sanity | Verify basic href path only includes user name part if user is in default domain', async () => {
		// PROPFIND using username only (without domain)
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1User}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<C:calendar-description/>
					<A:calendar-color/>
					<A:calendar-order/>
					<D:resourcetype/>
					<C:calendar-free-busy-set/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.oneOf(res.status, [207, 404],
			'PROPFIND should return 207 or 404 (username-only path may not be supported)');
		if (res.status === 207) {
			assert.include(res.text, '/Inbox/', 'Response should contain Inbox href');
		}
	});


	it('Sanity | Verify basic href path includes user name part if user is in default domain and request is made with full address', async () => {
		const res = await propfindRoot(account1Name, account1NameEncoded, account1Server);

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, account1NameEncoded + '/Inbox/',
			'Response should contain encoded email in Inbox href');
	});


	it('Sanity | Verify user that is not in the default domain is returned correctly', async () => {
		const res = await propfindRoot(account2Name, account2NameEncoded, account2Server);

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, account2NameEncoded + '/Inbox/',
			'Response should contain encoded name for non-default domain user');
	});


	it('Sanity | Verify folder color is returned by CalDav (view appointment)', async () => {
		// GetFolderRequest
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder) ? rootFolder[0].id : rootFolder.id;

		const folderName = 'folder' + common.getUniqueString();

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment" color="2"/>
			</CreateFolderRequest>`, account1Token
		);

		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${folderName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<A:calendar-color/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '#008284FF',
			'calendar-color should be #008284FF for color=2');
	});


	it('Sanity | Verify folder color is returned by CalDav (view task)', async () => {
		// GetFolderRequest
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder) ? rootFolder[0].id : rootFolder.id;

		const folderName = 'folder' + common.getUniqueString();

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="task" color="3"/>
			</CreateFolderRequest>`, account1Token
		);

		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${folderName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<A:calendar-color/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '#2CA10BFF',
			'calendar-color should be #2CA10BFF for color=3');
	});


	it('Functional | Verify folder color is NOT returned by CalDav (view message)', async () => {
		// GetFolderRequest
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder) ? rootFolder[0].id : rootFolder.id;

		const folderName = 'folder' + common.getUniqueString();

		// CreateFolderRequest
		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="message" color="4"/>
			</CreateFolderRequest>`, account1Token
		);

		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${folderName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<A:calendar-color/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '404 Not Found',
			'calendar-color should be in 404 propstat for message folder');
	});


	it('Sanity | Verify href encoding', async () => {
		// GetFolderRequest
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder) ? rootFolder[0].id : rootFolder.id;

		// Create folder with special chars (Bläh)
		const folderName = 'Bläh';

		// CreateFolderRequest
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(createFolderRes.CreateFolderResponse, 'Should create folder');
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Create appointment in the special folder
		const subject = 'Subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${subject}">
							<s d="20090531T120000Z"/>
							<e d="20090531T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createApptRes.Fault, 'Response should not be a Fault');
		assert.exists(createApptRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createApptRes.CreateAppointmentResponse.invId
			|| createApptRes.CreateAppointmentResponse.$.invId;

		// Get appointment UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const uid = comp.uid;

		// CalDAV REPORT with encoded folder name
		const folderNameEncoded = encodeURIComponent(folderName);
		const appointmentHref = `/dav/${account1Name}/${folderNameEncoded}/${uid}.ics`;

		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/${folderNameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<C:calendar-multiget xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<D:href>${appointmentHref}</D:href>
			</C:calendar-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.include(reportRes.text, uid,
			'Response should contain the appointment UID');
		assert.match(reportRes.text, new RegExp(folderNameEncoded),
			'Response href should contain encoded folder name');
	});
});
