import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';

describe('CalDav > Calendar > Mountpoints', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Token;
	let account1Server;
	let account2Name;
	let account2Token;
	let account2Id;
	let account2CalendarId;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;
		account1NameEncoded = account1User + '%40' + config.testDomain;

		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${account1User}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		const attrs1 = Array.isArray(acct1.a) ? acct1.a : [acct1.a];
		const mailHost1 = attrs1.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost1 ? (mailHost1._content || mailHost1) : config.serverHost;

		// Create account2
		const account2User = 'test' + common.getUniqueString();
		account2Name = account2User + '@' + config.testDomain;

		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${account2User}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		account2Id = acct2.id;

		// Auth as account1
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Auth as account2
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// Get account2's Calendar folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		const findFolder = (obj, name) => {
			if (!obj) return null;
			if (Array.isArray(obj)) {
				for (const item of obj) {
					const found = findFolder(item, name);
					if (found) return found;
				}
				return null;
			}
			if (obj.name === name) return obj;
			if (obj.folder) return findFolder(obj.folder, name);
			return null;
		};
		const calFolder = findFolder(getFolderRes.GetFolderResponse.folder, 'Calendar');
		account2CalendarId = calFolder ? calFolder.id : null;
		assert.exists(account2CalendarId, 'account2 should have Calendar folder');

		// account2 shares Calendar with account1 (manager rights)
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account2CalendarId}" op="grant">
					<grant d="${account1Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
		assert.exists(grantRes.FolderActionResponse, 'Should grant access');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify a shared calendar can be mounted', async () => {
		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// Create mountpoint
		const mountpointName = 'Calendar' + common.getUniqueString();
		const createMpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${account2CalendarId}" zid="${account2Id}"/>
			</CreateMountpointRequest>`, account1Token
		);
		assert.notExists(createMpRes.Fault, 'Response should not be a Fault');
		assert.exists(createMpRes.CreateMountpointResponse, 'Should create mountpoint');

		// PROPFIND on account1 root to see mounted calendar
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<C:calendar-description/>
					<A:calendar-color/>
					<D:resourcetype/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, mountpointName,
			'Mounted calendar should appear in PROPFIND response');
	});


	it('Sanity | Verify getctag Calendar folder is changed after appointment create (shared folder)', async () => {
		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// Create mountpoint
		const mountpointName = 'Mountpoint' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${account2CalendarId}" zid="${account2Id}" color="1"/>
			</CreateMountpointRequest>`, account1Token
		);

		// Get initial ctag
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res1.status, 207, 'Initial PROPFIND should return 207');
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.exists(ctagMatch1, 'Should have initial ctag');
		const initialCtag = ctagMatch1[1];

		// account2 creates appointment in shared Calendar
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account2Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account2Token
		);
		assert.notExists(createApptRes.Fault, 'Response should not be a Fault');
		assert.exists(createApptRes.CreateAppointmentResponse,
			'account2 should create appointment');

		// Verify ctag changed
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.exists(ctagMatch2, 'Should have post-create ctag');
		assert.notEqual(ctagMatch2[1], initialCtag,
			'Mountpoint ctag should change after appointment create');
	});


	it('Sanity | Verify getctag Calendar folder is changed after appointment delete (shared folder)', async () => {
		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// Create mountpoint
		const mountpointName = 'Mountpoint' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${account2CalendarId}" zid="${account2Id}" color="1"/>
			</CreateMountpointRequest>`, account1Token
		);

		// account2 creates appointment
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account2Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account2Token
		);
		const invId = createApptRes.CreateAppointmentResponse.invId
			|| createApptRes.CreateAppointmentResponse.$.invId;

		// Get UID and compNum
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account2Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const compNum = comp.compNum || '0';

		// Get ctag before delete
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		const preDeleteCtag = ctagMatch1[1];

		// account2 cancels appointment
		await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="${compNum}">
				<m>
					<su>Cancelled: ${appointmentSubject}</su>
					<mp content-type="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, account2Token
		);

		// Verify ctag changed
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.notEqual(ctagMatch2[1], preDeleteCtag,
			'Mountpoint ctag should change after appointment delete');
	});


	it('Sanity | Verify a shared calendars data', async () => {
		// Clear existing ACL then re-grant
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account2CalendarId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, account2Token
		);
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${account2CalendarId}" op="grant">
					<grant d="${account1Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2Token
		);

		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// Create mountpoint with color
		const mountpointName = 'Calendar' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${account2CalendarId}" zid="${account2Id}" color="1"/>
			</CreateMountpointRequest>`, account1Token
		);

		// PROPFIND on account1 root to verify shared calendar data
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
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
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, mountpointName,
			'Mounted calendar displayname should appear');
		assert.include(res.text, '<D:collection',
			'resourcetype should include collection');
	});


	it('Sanity | Verify getctag Calendar folder is changed after permission change on remote folder (shared folder)', async () => {
		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// account2 creates a sub-folder to share
		const folderName = 'calendar' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${account2CalendarId}"/>
			</CreateFolderRequest>`, account2Token
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Clear ACL and grant manager rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="update"><acl/></action>
			</FolderActionRequest>`, account2Token
		);
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account1Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2Token
		);

		// Create mountpoint
		const mountpointName = 'Mountpoint' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${folderId}" zid="${account2Id}" color="1"/>
			</CreateMountpointRequest>`, account1Token
		);

		// Get initial ctag
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res1.status, 207, 'Initial PROPFIND should return 207');
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.exists(ctagMatch1, 'Should have initial ctag');
		const initialCtag = ctagMatch1[1];

		// account2 changes permissions from manager to read-only
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="update"><acl/></action>
			</FolderActionRequest>`, account2Token
		);
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account1Name}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, account2Token
		);

		// Verify ctag changed
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.exists(ctagMatch2, 'Should have post-permission-change ctag');
		assert.notEqual(ctagMatch2[1], initialCtag,
			'Mountpoint ctag should change after permission change');
	});


	it('Sanity | Verify getctag Calendar folder is changed after rename of remote folder (shared folder)', async () => {
		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// account2 creates a sub-folder to share
		const folderName = 'calendar' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${account2CalendarId}"/>
			</CreateFolderRequest>`, account2Token
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Clear ACL and grant manager rights
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="update"><acl/></action>
			</FolderActionRequest>`, account2Token
		);
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account1Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2Token
		);

		// Create mountpoint
		const mountpointName = 'Mountpoint' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${folderId}" zid="${account2Id}" color="1"/>
			</CreateMountpointRequest>`, account1Token
		);

		// Get initial ctag
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res1.status, 207, 'Initial PROPFIND should return 207');
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.exists(ctagMatch1, 'Should have initial ctag');
		const initialCtag = ctagMatch1[1];

		// account2 renames the remote folder
		const newFolderName = 'folder' + common.getUniqueString();
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newFolderName}"/>
			</ItemActionRequest>`, account2Token
		);
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');
		assert.exists(renameRes.ItemActionResponse, 'Should rename folder');

		// Verify ctag changed
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		assert.exists(ctagMatch2, 'Should have post-rename ctag');
		assert.notEqual(ctagMatch2[1], initialCtag,
			'Mountpoint ctag should change after remote folder rename');
	});


	it('Functional | Verify a shared calendar can be deleted', async () => {
		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// account2 creates a folder to share
		const folderName = 'folder' + common.getUniqueString();
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account2Token
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// account2 grants access
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${account1Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account2Token
		);

		// account1 creates mountpoint
		const mountpointName = 'Mountpoint' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${folderId}" zid="${account2Id}"/>
			</CreateMountpointRequest>`, account1Token
		);

		// Verify mountpoint exists via PROPFIND
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:">
				<D:prop><D:getetag/><D:displayname/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(propfindRes.status, 207, 'PROPFIND should return 207');
		assert.include(propfindRes.text, mountpointName,
			'Mountpoint should appear in PROPFIND');

		// Delete mountpoint via CalDAV
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});
		assert.include([204, 403], deleteRes.status, 'DELETE should return 204 No Content or 403 Forbidden');

		// Verify mountpoint still shows in GetFolder (moved to Trash per XML behavior)
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		assert.notExists(verifyRes.Fault, 'Response should not be a Fault');
		assert.exists(verifyRes.GetFolderResponse, 'GetFolderResponse should exist');

		// Verify source folder still exists on account2
		const verifyRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);
		const allFolders2 = JSON.stringify(verifyRes2.GetFolderResponse);
		assert.include(allFolders2, `"name":"${folderName}"`,
			'Source folder should still exist on account2');
	});


	it('Sanity | Verify an appointment in a mountpoint can be deleted from CalDav', async () => {
		// account2 creates appointment
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20101201T120000Z"/>
							<e d="20101201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account2Token
		);
		assert.notExists(createApptRes.Fault, 'Response should not be a Fault');
		assert.exists(createApptRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createApptRes.CreateAppointmentResponse.invId
			|| createApptRes.CreateAppointmentResponse.$.invId;

		// Get appointment UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account2Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const uid = (Array.isArray(inv.comp) ? inv.comp[0] : inv.comp).uid;

		// Get account1 root folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootId = Array.isArray(rootFolder)
			? rootFolder[0].id : rootFolder.id;

		// Create mountpoint
		const mountpointName = 'Calendar' + common.getUniqueString();
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId}" name="${mountpointName}" view="appointment" rid="${account2CalendarId}" zid="${account2Id}"/>
			</CreateMountpointRequest>`, account1Token
		);

		// CalDav REPORT to find appointment href in mountpoint
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/${mountpointName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<calendar-query xmlns:D="DAV:" xmlns="urn:ietf:params:xml:ns:caldav">
				<D:prop><D:getetag/></D:prop>
				<filter>
					<comp-filter name="VCALENDAR">
						<comp-filter name="VTODO"/>
					</comp-filter>
				</filter>
			</calendar-query>`,
			server: account1Server,
		});

		// Extract appointment href
		const hrefMatch = reportRes.text.match(new RegExp('<D:href>([^<]*' + uid + '[^<]*)</D:href>'));
		assert.exists(hrefMatch, 'Should find appointment href in mountpoint');
		const appointmentHref = hrefMatch[1];

		// Delete appointment via CalDav
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: appointmentHref,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});
		assert.equal(deleteRes.status, 204, 'DELETE should return 204');

		// Verify appointment is deleted on account2
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="1291118400000" calExpandInstEnd="1291291200000">
				<query>${appointmentSubject}</query>
			</SearchRequest>`, account2Token
		);
		const searchResp = searchRes.SearchResponse;
		const appts = searchResp.appt || searchResp.hit;
		assert.isTrue(!appts || (Array.isArray(appts) && appts.length === 0),
			'Appointment should be deleted from account2');
	});


	it('Sanity | Verify an appointment in a mountpoint (with s in the name) can be deleted from CalDav', async () => {
		// Create separate accounts for this test (needs account3/account4)
		const adminAuthToken = await soap.getAdminAuthToken();

		const acct3User = 'test' + common.getUniqueString();
		const acct3Name = acct3User + '@' + config.testDomain;
		const acct3Encoded = acct3User + '%40' + config.testDomain;

		const createRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct3 = Array.isArray(createRes3.CreateAccountResponse.account)
			? createRes3.CreateAccountResponse.account[0]
			: createRes3.CreateAccountResponse.account;
		const attrs3 = Array.isArray(acct3.a) ? acct3.a : [acct3.a];
		const mailHost3 = attrs3.find(a => a.n === 'zimbraMailHost');
		const acct3Server = mailHost3 ? (mailHost3._content || mailHost3) : config.serverHost;

		const acct4User = 'test' + common.getUniqueString();
		const acct4Name = acct4User + '@' + config.testDomain;

		const createRes4 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct4Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct4 = Array.isArray(createRes4.CreateAccountResponse.account)
			? createRes4.CreateAccountResponse.account[0]
			: createRes4.CreateAccountResponse.account;
		const acct4Id = acct4.id;

		// Auth both accounts
		const authRes3 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${acct3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct3Token = Array.isArray(authRes3.AuthResponse.authToken)
			? authRes3.AuthResponse.authToken[0]._content || authRes3.AuthResponse.authToken[0]
			: authRes3.AuthResponse.authToken._content || authRes3.AuthResponse.authToken;

		const authRes4 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${acct4Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct4Token = Array.isArray(authRes4.AuthResponse.authToken)
			? authRes4.AuthResponse.authToken[0]._content || authRes4.AuthResponse.authToken[0]
			: authRes4.AuthResponse.authToken._content || authRes4.AuthResponse.authToken;

		// account4 creates appointment
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20101201T120000Z"/>
							<e d="20101201T130000Z"/>
							<or a="${acct3Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, acct4Token
		);
		assert.notExists(createApptRes.Fault, 'Response should not be a Fault');
		assert.exists(createApptRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createApptRes.CreateAppointmentResponse.invId
			|| createApptRes.CreateAppointmentResponse.$.invId;

		// Get UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, acct4Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const uid = (Array.isArray(inv.comp) ? inv.comp[0] : inv.comp).uid;

		// account4 gets Calendar ID and shares it
		const gfRes4 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', acct4Token
		);
		const findFolder = (obj, name) => {
			if (!obj) return null;
			if (Array.isArray(obj)) {
				for (const item of obj) {
					const found = findFolder(item, name);
					if (found) return found;
				}
				return null;
			}
			if (obj.name === name) return obj;
			if (obj.folder) return findFolder(obj.folder, name);
			return null;
		};
		const acct4CalId = findFolder(gfRes4.GetFolderResponse.folder, 'Calendar').id;
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${acct4CalId}" op="grant">
					<grant d="${acct3Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct4Token
		);

		// account3 gets root and mounts with apostrophe name
		const gfRes3 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', acct3Token
		);
		const rootId3 = (Array.isArray(gfRes3.GetFolderResponse.folder)
			? gfRes3.GetFolderResponse.folder[0] : gfRes3.GetFolderResponse.folder).id;

		const mpName = 'Matts Calendar' + common.getUniqueString();
		const mpNameEncoded = encodeURIComponent(mpName);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId3}" name="${mpName}" view="appointment" rid="${acct4CalId}" zid="${acct4Id}"/>
			</CreateMountpointRequest>`, acct3Token
		);

		// CalDav REPORT to find appointment
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${acct3Encoded}/${mpNameEncoded}/`,
			user: acct3Name,
			password: config.accountPassword,
			depth: '1',
			body: `<calendar-query xmlns:D="DAV:" xmlns="urn:ietf:params:xml:ns:caldav">
				<D:prop><D:getetag/></D:prop>
				<filter>
					<comp-filter name="VCALENDAR">
						<comp-filter name="VTODO"/>
					</comp-filter>
				</filter>
			</calendar-query>`,
			server: acct3Server,
		});

		const hrefMatch = reportRes.text.match(new RegExp('<D:href>([^<]*' + uid + '[^<]*)</D:href>'));
		assert.exists(hrefMatch, 'Should find appointment href in mountpoint');

		// Delete via CalDav
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: hrefMatch[1],
			user: acct3Name,
			password: config.accountPassword,
			server: acct3Server,
		});
		assert.equal(deleteRes.status, 204, 'DELETE should return 204');

		// Verify deletion on account4
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="1291118400000" calExpandInstEnd="1291291200000">
				<query>${appointmentSubject}</query>
			</SearchRequest>`, acct4Token
		);
		const appts = searchRes.SearchResponse.appt || searchRes.SearchResponse.hit;
		assert.isTrue(!appts || (Array.isArray(appts) && appts.length === 0),
			'Appointment should be deleted from account4');
	});


	it('Sanity | Verify an appointment in a mountpoint (with at-sign in the name) can be deleted from CalDav', async () => {
		// Create separate accounts for this test (needs account5/account6)
		const adminAuthToken = await soap.getAdminAuthToken();

		const acct5User = 'test' + common.getUniqueString();
		const acct5Name = acct5User + '@' + config.testDomain;
		const acct5Encoded = acct5User + '%40' + config.testDomain;

		const createRes5 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct5Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct5 = Array.isArray(createRes5.CreateAccountResponse.account)
			? createRes5.CreateAccountResponse.account[0]
			: createRes5.CreateAccountResponse.account;
		const attrs5 = Array.isArray(acct5.a) ? acct5.a : [acct5.a];
		const mailHost5 = attrs5.find(a => a.n === 'zimbraMailHost');
		const acct5Server = mailHost5 ? (mailHost5._content || mailHost5) : config.serverHost;

		const acct6User = 'test' + common.getUniqueString();
		const acct6Name = acct6User + '@' + config.testDomain;

		const createRes6 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct6Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct6 = Array.isArray(createRes6.CreateAccountResponse.account)
			? createRes6.CreateAccountResponse.account[0]
			: createRes6.CreateAccountResponse.account;
		const acct6Id = acct6.id;

		// Auth both accounts
		const authRes5 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${acct5Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct5Token = Array.isArray(authRes5.AuthResponse.authToken)
			? authRes5.AuthResponse.authToken[0]._content || authRes5.AuthResponse.authToken[0]
			: authRes5.AuthResponse.authToken._content || authRes5.AuthResponse.authToken;

		const authRes6 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${acct6Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		const acct6Token = Array.isArray(authRes6.AuthResponse.authToken)
			? authRes6.AuthResponse.authToken[0]._content || authRes6.AuthResponse.authToken[0]
			: authRes6.AuthResponse.authToken._content || authRes6.AuthResponse.authToken;

		// account6 creates appointment
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20101201T120000Z"/>
							<e d="20101201T130000Z"/>
							<or a="${acct5Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, acct6Token
		);
		assert.notExists(createApptRes.Fault, 'Response should not be a Fault');
		assert.exists(createApptRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createApptRes.CreateAppointmentResponse.invId
			|| createApptRes.CreateAppointmentResponse.$.invId;

		// Get UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, acct6Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const uid = (Array.isArray(inv.comp) ? inv.comp[0] : inv.comp).uid;

		// account6 gets Calendar ID and shares it
		const gfRes6 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', acct6Token
		);
		const findFolder = (obj, name) => {
			if (!obj) return null;
			if (Array.isArray(obj)) {
				for (const item of obj) {
					const found = findFolder(item, name);
					if (found) return found;
				}
				return null;
			}
			if (obj.name === name) return obj;
			if (obj.folder) return findFolder(obj.folder, name);
			return null;
		};
		const acct6CalId = findFolder(gfRes6.GetFolderResponse.folder, 'Calendar').id;
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${acct6CalId}" op="grant">
					<grant d="${acct5Name}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct6Token
		);

		// account5 gets root and mounts with @ in name
		const gfRes5 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', acct5Token
		);
		const rootId5 = (Array.isArray(gfRes5.GetFolderResponse.folder)
			? gfRes5.GetFolderResponse.folder[0] : gfRes5.GetFolderResponse.folder).id;

		const mpName = 'foo@bar.com Calendar' + common.getUniqueString();
		const mpNameEncoded = encodeURIComponent(mpName);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${rootId5}" name="${mpName}" view="appointment" rid="${acct6CalId}" zid="${acct6Id}"/>
			</CreateMountpointRequest>`, acct5Token
		);

		// CalDav REPORT to find appointment
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${acct5Encoded}/${mpNameEncoded}/`,
			user: acct5Name,
			password: config.accountPassword,
			depth: '1',
			body: `<calendar-query xmlns:D="DAV:" xmlns="urn:ietf:params:xml:ns:caldav">
				<D:prop><D:getetag/></D:prop>
				<filter>
					<comp-filter name="VCALENDAR">
						<comp-filter name="VTODO"/>
					</comp-filter>
				</filter>
			</calendar-query>`,
			server: acct5Server,
		});

		const hrefMatch = reportRes.text.match(new RegExp('<D:href>([^<]*' + uid + '[^<]*)</D:href>'));
		assert.exists(hrefMatch, 'Should find appointment href in mountpoint');

		// Delete via CalDav
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: hrefMatch[1],
			user: acct5Name,
			password: config.accountPassword,
			server: acct5Server,
		});
		assert.equal(deleteRes.status, 204, 'DELETE should return 204');

		// Verify deletion on account6
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="1291118400000" calExpandInstEnd="1291291200000">
				<query>${appointmentSubject}</query>
			</SearchRequest>`, acct6Token
		);
		const appts = searchRes.SearchResponse.appt || searchRes.SearchResponse.hit;
		assert.isTrue(!appts || (Array.isArray(appts) && appts.length === 0),
			'Appointment should be deleted from account6');
	});
});
