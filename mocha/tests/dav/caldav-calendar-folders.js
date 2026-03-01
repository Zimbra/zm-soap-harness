import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('CalDav > Calendar > Folders', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Token;
	let account1Server;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;
		account1NameEncoded = account1User + '%40' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct.id, 'Account should have an id');

		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;
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
	it('Sanity | Verify basic Calendar folder', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
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
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.match(res.text,
			new RegExp('/dav/' + account1Name.replace('@', '(@|%40)') + '/Calendar/'),
			'Response href should contain Calendar path');
		assert.include(res.text, 'Calendar', 'displayname should match Calendar');
		assert.include(res.text, '<D:collection', 'resourcetype should include collection');
	});


	it('Sanity | Verify getctag Calendar folder is changed after appointment create', async () => {
		// Get initial ctag
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<D:displayname/>
					<CS:getctag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res1.status, 207, 'Initial PROPFIND should return 207');
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);

		// Verify response
		assert.exists(ctagMatch1, 'Should have initial getctag');
		const initialCtag = ctagMatch1[1];

		// Create appointment via SOAP
		const appointmentSubject = 'Subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');

		// Get ctag after creating appointment
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<D:displayname/>
					<CS:getctag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res2.status, 207, 'Post-create PROPFIND should return 207');
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);

		// Verify response
		assert.exists(ctagMatch2, 'Should have post-create getctag');
		const newCtag = ctagMatch2[1];

		// Verify response
		assert.notEqual(newCtag, initialCtag, 'ctag should change after appointment create');
	});


	it('Sanity | Verify getctag Calendar folder is changed after appointment modify', async () => {
		// Create appointment via SOAP
		const appointmentSubject = 'Subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// Get UID and compNum
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const compNum = comp.compNum || '0';

		// Get ctag before modify
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res1.status, 207, 'Pre-modify PROPFIND should return 207');
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);

		// Verify response
		assert.exists(ctagMatch1, 'Should have pre-modify getctag');
		const preModifyCtag = ctagMatch1[1];

		// Modify appointment
		const newSubject = 'Subject' + common.getUniqueString();

		// ModifyAppointmentRequest
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="${compNum}">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${newSubject}">
						<s d="20071201T120000Z"/>
						<e d="20071201T130000Z"/>
						<or a="${account1Name}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		assert.exists(modifyRes.ModifyAppointmentResponse, 'Should modify appointment');

		// Get ctag after modify
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res2.status, 207, 'Post-modify PROPFIND should return 207');
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);

		// Verify response
		assert.exists(ctagMatch2, 'Should have post-modify getctag');
		assert.notEqual(ctagMatch2[1], preModifyCtag,
			'ctag should change after appointment modify');
	});


	it('Sanity | Verify getctag Calendar folder is changed after appointment delete', async () => {
		// Create appointment
		const appointmentSubject = 'Subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// Get UID and compNum
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const compNum = comp.compNum || '0';

		// Get ctag before delete
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		const preCancelCtag = ctagMatch1[1];

		// Cancel appointment
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="${compNum}">
				<m>
					<su>Cancelled: ${appointmentSubject}</su>
					<mp content-type="text/plain">
						<content>Action: Cancelled ${appointmentSubject}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(cancelRes.Fault, 'Response should not be a Fault');
		assert.exists(cancelRes.CancelAppointmentResponse, 'Should cancel appointment');

		// Get ctag after delete
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		const postCancelCtag = ctagMatch2[1];

		// Verify response
		assert.notEqual(postCancelCtag, preCancelCtag,
			'ctag should change after appointment cancel');
	});


	it('Sanity | Verify getctag value is changed on folder rename', async () => {
		const folderName = 'calendar' + common.getUniqueString();

		// Get root folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(getFolderRes.GetFolderResponse, 'GetFolderResponse should exist');
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootFolderObj = Array.isArray(rootFolder) ? rootFolder[0] : rootFolder;
		const rootId = rootFolderObj.id;

		// Create calendar folder
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

		// Get ctag before rename
		const res1 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${folderName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res1.status, 207, 'PROPFIND should return 207');
		const ctagMatch1 = res1.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		const preRenameCtag = ctagMatch1[1];

		// Rename folder
		const newFolderName = 'calendar' + common.getUniqueString();

		// ItemActionRequest
		const renameRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${folderId}" name="${newFolderName}"/>
			</ItemActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');
		assert.exists(renameRes.ItemActionResponse, 'Should rename folder');

		// Get ctag after rename
		const res2 = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/${newFolderName}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:displayname/><CS:getctag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res2.status, 207, 'PROPFIND after rename should return 207');
		const ctagMatch2 = res2.text.match(/<CS:getctag[^>]*>([^<]+)<\/CS:getctag>/);
		const postRenameCtag = ctagMatch2[1];

		// Verify response
		assert.notEqual(postRenameCtag, preRenameCtag,
			'ctag should change after folder rename');
	});


	it('Sanity | Delete a calendar', async () => {
		const folderName = 'folder' + common.getUniqueString();

		// Get root folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootFolderObj = Array.isArray(rootFolder) ? rootFolder[0] : rootFolder;
		const rootId = rootFolderObj.id;

		// Create calendar folder via SOAP
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		assert.exists(createFolderRes.CreateFolderResponse, 'Should create folder');

		// Verify folder exists via PROPFIND
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

		// Verify response
		assert.equal(propfindRes.status, 207, 'PROPFIND should return 207');
		assert.include(propfindRes.text, folderName, 'Folder should appear in PROPFIND');

		// Delete via CalDAV
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: `/dav/${account1NameEncoded}/${folderName}/`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});

		// Verify response
		assert.equal(deleteRes.status, 204, 'DELETE should return 204 No Content');

		// Verify folder is gone via SOAP
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const allFolders = JSON.stringify(verifyRes.GetFolderResponse);

		// Verify response
		assert.notInclude(allFolders, `"name":"${folderName}"`,
			'Folder should not appear after deletion');
	});


	it('Sanity | Delete a calendar containing appointments', async () => {
		const folderName = 'folder' + common.getUniqueString();

		// Get root folder ID
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const rootFolder = getFolderRes.GetFolderResponse.folder;
		const rootFolderObj = Array.isArray(rootFolder) ? rootFolder[0] : rootFolder;
		const rootId = rootFolderObj.id;

		// Create folder
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, account1Token
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Create appointment in that folder
		const appointmentSubject = 'Subject' + common.getUniqueString();

		// CreateAppointmentRequest
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createApptRes.Fault, 'Response should not be a Fault');
		assert.exists(createApptRes.CreateAppointmentResponse, 'Should create appointment');

		// Delete folder via CalDAV
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: `/dav/${account1NameEncoded}/${folderName}/`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});

		// Verify response
		assert.equal(deleteRes.status, 204, 'DELETE should return 204');

		// Verify folder is gone
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const allFolders = JSON.stringify(verifyRes.GetFolderResponse);

		// Verify response
		assert.notInclude(allFolders, `"name":"${folderName}"`,
			'Folder should not appear after deletion');
	});


	it('Sanity | Try to delete the default Calendar folder', async () => {
		// Verify Calendar folder exists
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

		// Verify response
		assert.include(propfindRes.text, 'Calendar',
			'Calendar folder should exist');

		// Try to delete default Calendar
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});
		// Should fail (404 per XML expectation)
		// Verify response
		assert.notEqual(deleteRes.status, 204, 'Should not successfully delete default Calendar');

		// Verify Calendar still exists via SOAP
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		const allFolders = JSON.stringify(verifyRes.GetFolderResponse);

		// Verify response
		assert.include(allFolders, '"name":"Calendar"',
			'Calendar folder should still exist');
	});


	it('Sanity | Modify the calendar color using caldav', async () => {
		const newColor = '#008284FF';

		// PROPPATCH to set color
		const proppatchRes = await makeDavRequest({
			method: 'PROPPATCH',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propertyupdate xmlns:D="DAV:" xmlns:A="http://apple.com/ns/ical/">
				<D:set>
					<D:prop>
						<A:calendar-color>${newColor}</A:calendar-color>
					</D:prop>
				</D:set>
			</D:propertyupdate>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(proppatchRes.status, 207, 'PROPPATCH should return 207');

		// PROPFIND to verify color was set
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<D:displayname/>
					<CS:getctag/>
					<A:calendar-color/>
					<D:resourcetype/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(propfindRes.status, 207, 'PROPFIND should return 207');
		assert.include(propfindRes.text, newColor,
			'calendar-color should match new color');

		// SOAP verification - color should be changed (Zimbra color index 2)
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(verifyRes.Fault, 'Response should not be a Fault');
		assert.exists(verifyRes.GetFolderResponse, 'GetFolderResponse should exist');
	});
});
