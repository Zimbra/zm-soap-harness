import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Sharing > Permissions Guest', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Token;
	let account2Email;
	let guest1Email, guest2Email, guest3Email;
	let message1Id, message1Subject, message1Content;
	let folderId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

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

		guest1Email = 'guest1' + common.getUniqueString() + '@foo.com';
		guest2Email = 'guest2' + common.getUniqueString() + '@bar.com';
		guest3Email = 'guest3' + common.getUniqueString() + '@bar.com';

		// Get inbox folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = getFolderRes.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		const inboxId = inbox.id;

		// Create subfolder under Inbox
		const folderName = 'folder' + common.getUniqueString();

		// CreateFolderRequest
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createFolderRes.Fault, 'Response should not be a Fault');
		folderId = createFolderRes.CreateFolderResponse.folder[0].id;

		// Send a message to account2
		message1Subject = 'subject' + common.getUniqueString();
		message1Content = 'content' + common.getUniqueString();

		// SendMsgRequest
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${message1Subject}</su>
					<mp ct="text/plain">
						<content>${message1Content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const m1 = sendRes.SendMsgResponse?.m;
		message1Id = (Array.isArray(m1) ? m1[0] : m1).id;

		// Move message to the subfolder
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message1Id}" op="move" l="${folderId}"/>
			</MsgActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');
		const actionArr = moveRes.MsgActionResponse.action;
		const moveAction = Array.isArray(actionArr) ? actionArr[0] : actionArr;

		// Verify response
		assert.equal(moveAction.op, 'move', 'Action op should be move');
		assert.equal(moveAction.id, message1Id, 'Action id should match message id');

		// Grant guest1 read access to the subfolder
		const grant1Res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" perm="r" d="${guest1Email}" args="guest1password"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(grant1Res.Fault, 'Response should not be a Fault');

		// Grant guest2 read access to the subfolder
		const grant2Res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" perm="r" d="${guest2Email}" args="guest2password"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify response
		assert.notExists(grant2Res.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that a guest can access a shared REST file with valid user, valid password', async () => {
		const res = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: guest1Email,
			password: 'guest1password'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, account2Email, 'Response body should contain To address');
		assert.include(res.body, message1Subject, 'Response body should contain Subject');
	});


	it('Sanity | Verify that a guest can NOT access a shared REST file with invalid user, valid password', async () => {
		const res = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: 'invalid' + guest1Email,
			password: 'guest1password'
		});

		// Verify response
		assert.equal(res.status, 401, 'Invalid guest user should return 401');
	});


	it('Sanity | Verify that a guest can NOT access a shared REST file with valid user, invalid password', async () => {
		const res = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: guest1Email,
			password: 'invalidguest1password'
		});

		// Verify response
		assert.equal(res.status, 401, 'Invalid password should return 401');
	});


	it('Sanity | Verify that a guest can NOT access a shared REST file with invalid user, invalid password', async () => {
		const res = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: 'invalid' + guest1Email,
			password: 'invalidguest1password'
		});

		// Verify response
		assert.equal(res.status, 401, 'Invalid guest and password should return 401');
	});


	it('Sanity | Verify that a folder can be shared to multiple guests simultaneously', async () => {
		// guest1 should have access (200) with correct content
		const res1 = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: guest1Email,
			password: 'guest1password'
		});

		// Verify response
		assert.equal(res1.status, 200, 'Guest1 REST GET should return 200');
		assert.include(res1.body, account2Email, 'Guest1 response should contain To address');
		assert.include(res1.body, message1Subject, 'Guest1 response should contain Subject');

		// guest2 should have access (200) with correct content
		const res2 = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: guest2Email,
			password: 'guest2password'
		});

		// Verify response
		assert.equal(res2.status, 200, 'Guest2 REST GET should return 200');
		assert.include(res2.body, account2Email, 'Guest2 response should contain To address');
		assert.include(res2.body, message1Subject, 'Guest2 response should contain Subject');

		// guest3 should NOT have access (401)
		const res3 = await rest.makeRestRequest(null, {
			user: account1Email,
			id: message1Id,
			guest: guest3Email,
			password: 'guest3password'
		});

		// Verify response
		assert.equal(res3.status, 401, 'Guest3 without grant should return 401');
	});
});
