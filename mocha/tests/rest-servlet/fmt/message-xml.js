import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';

describe('Rest Servlet > Fmt > Message XML', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email;
	let folder1Name;

	before(async function () {
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

		// Get inbox ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');

		const findFolder = (folder, name) => {
			if (folder.name === name) return folder.id;
			if (folder.folder) {
				const folders = Array.isArray(folder.folder) ? folder.folder : [folder.folder];
				for (const f of folders) {
					const r = findFolder(f, name);
					if (r) return r;
				}
			}
			return null;
		};
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const inboxId = findFolder(root, 'Inbox');

		// Create subfolder
		folder1Name = 'folder1.' + common.getUniqueString();

		// CreateFolderRequest
		const createFolder1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="${inboxId}"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createFolder1.Fault, 'Response should not be a Fault');
		const folder1Id = (Array.isArray(createFolder1.CreateFolderResponse.folder)
			? createFolder1.CreateFolderResponse.folder[0]
			: createFolder1.CreateFolderResponse.folder).id;

		// Add message to inbox
		const addMsg1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: foo@foo.com\r\nTo: foo@foo.com\r\nSubject: email01A\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\nemail01A content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addMsg1.Fault, 'Response should not be a Fault');

		// Add message to subfolder
		const addMsg2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${folder1Id}">
					<content>From: foo@foo.com\r\nTo: foo@foo.com\r\nSubject: email01B\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\nemail01B content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addMsg2.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify basic XML format', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'xml'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'email01A', 'XML response should contain message subject');
	});


	it('Sanity | With REST url with spaces verify that the trailing spaces are trimmed and return expected response', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox/' + folder1Name,
			fmt: 'xml'
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'email01B', 'XML response should contain subfolder message');
	});
});
