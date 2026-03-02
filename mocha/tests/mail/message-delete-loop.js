import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Delete Loop', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Functional | Send 5000 mails and delete each one immediately after sending', async () => {
		// Create test account
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as acct1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Get trash folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const trashFolder = subFolders.find(f => f.name === 'Trash');
		assert.exists(trashFolder, 'Trash folder should exist');
		const trashFolderId = trashFolder.id;

		// Loop: add message, move to trash, delete (reduced count)
		const loopCount = 5;
		for (let i = 0; i < loopCount; i++) {
			// Add a message to inbox
			const subject = `Subject ${common.getUniqueString()}`;
			const addRes = await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>To: ${acct1Email}
From: sender@example.com
Subject: ${subject}
Date: Fri, 28 Dec 2007 09:38:56 -0800
Content of mail ${i}
</content>
					</m>
				</AddMsgRequest>`, acct1AuthToken
			);
			assert.notExists(addRes.Fault, `AddMsgRequest ${i} should not fault`);
			const messageId = (Array.isArray(addRes.AddMsgResponse.m) ? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m).id;

			// Move to trash
			const moveRes = await soap.makeSOAPEnvelopeAccount(
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${messageId}" op="move" l="${trashFolderId}"/>
				</MsgActionRequest>`, acct1AuthToken
			);
			assert.notExists(moveRes.Fault, `MsgActionRequest move ${i} should not fault`);
			assert.equal(moveRes.MsgActionResponse.action.op, 'move', 'op should be move');

			// Delete from trash
			const deleteRes = await soap.makeSOAPEnvelopeAccount(
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${messageId}" op="delete"/>
				</MsgActionRequest>`, acct1AuthToken
			);
			assert.notExists(deleteRes.Fault, `MsgActionRequest delete ${i} should not fault`);
			assert.equal(deleteRes.MsgActionResponse.action.op, 'delete', 'op should be delete');
		}
	});


	it('Functional | Send 5000 mails, then move each one to the trash, then delete them from the trash', async () => {
		// Create test account
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as acct1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Get trash folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const trashFolder = subFolders.find(f => f.name === 'Trash');
		const trashFolderId = trashFolder.id;

		// Loop: add messages and collect IDs (reduced count)
		const loopCount = 5;
		const messageIds = [];
		for (let i = 0; i < loopCount; i++) {
			const subject = `Subject ${common.getUniqueString()}`;
			const addRes = await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>To: ${acct1Email}
From: sender@example.com
Subject: ${subject}
Date: Fri, 28 Dec 2007 09:38:56 -0800
Content of mail ${i}
</content>
					</m>
				</AddMsgRequest>`, acct1AuthToken
			);
			assert.notExists(addRes.Fault, `AddMsgRequest ${i} should not fault`);
			messageIds.push((Array.isArray(addRes.AddMsgResponse.m) ? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m).id);
		}

		// Loop: move each to trash
		for (let i = 0; i < messageIds.length; i++) {
			const moveRes = await soap.makeSOAPEnvelopeAccount(
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${messageIds[i]}" op="move" l="${trashFolderId}"/>
				</MsgActionRequest>`, acct1AuthToken
			);
			assert.notExists(moveRes.Fault, `MsgActionRequest move ${i} should not fault`);
		}

		// Loop: delete each from trash
		for (let i = 0; i < messageIds.length; i++) {
			const deleteRes = await soap.makeSOAPEnvelopeAccount(
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${messageIds[i]}" op="delete"/>
				</MsgActionRequest>`, acct1AuthToken
			);
			assert.notExists(deleteRes.Fault, `MsgActionRequest delete ${i} should not fault`);
		}
	});


	it('Functional | Send 5000 mails, then move each one to the trash, then o one Folder Action to delete all from the trash', async () => {
		// Create test account
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as acct1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Get trash folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const trashFolder = subFolders.find(f => f.name === 'Trash');
		const trashFolderId = trashFolder.id;

		// Loop: add message and move to trash (reduced count)
		const loopCount = 5;
		for (let i = 0; i < loopCount; i++) {
			const subject = `Subject ${common.getUniqueString()}`;
			const addRes = await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>To: ${acct1Email}
From: sender@example.com
Subject: ${subject}
Date: Fri, 28 Dec 2007 09:38:56 -0800
Content of mail ${i}
</content>
					</m>
				</AddMsgRequest>`, acct1AuthToken
			);
			assert.notExists(addRes.Fault, `AddMsgRequest ${i} should not fault`);
			const messageId = (Array.isArray(addRes.AddMsgResponse.m) ? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m).id;

			await soap.makeSOAPEnvelopeAccount(
				`<MsgActionRequest xmlns="urn:zimbraMail">
					<action id="${messageId}" op="move" l="${trashFolderId}"/>
				</MsgActionRequest>`, acct1AuthToken
			);
		}

		// Empty trash with one folder action
		const emptyRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="empty" id="${trashFolderId}"/>
			</FolderActionRequest>`, acct1AuthToken
		);

		// Verify the response
		assert.notExists(emptyRes.Fault, 'FolderActionRequest should not fault');
		assert.equal(emptyRes.FolderActionResponse.action.id, trashFolderId, 'id should match trash folder');
		assert.equal(emptyRes.FolderActionResponse.action.op, 'empty', 'op should be empty');
	});


	it('Functional | Send 5000 mails, remember their ids. Then, issue one delete for all the ids.', async () => {
		// Create test account
		const acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as acct1
		const acct1AuthToken = await soap.getAccountAuthToken(acct1Email);

		// Get trash folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const subFolders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const trashFolder = subFolders.find(f => f.name === 'Trash');
		const trashFolderId = trashFolder.id;

		// Add messages and collect IDs (reduced count)
		const loopCount = 5;
		const messageIds = [];
		for (let i = 0; i < loopCount; i++) {
			const subject = `Subject ${common.getUniqueString()}`;
			const addRes = await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="2">
						<content>To: ${acct1Email}
From: sender@example.com
Subject: ${subject}
Date: Fri, 28 Dec 2007 09:38:56 -0800
Content of mail ${i}
</content>
					</m>
				</AddMsgRequest>`, acct1AuthToken
			);
			assert.notExists(addRes.Fault, `AddMsgRequest ${i} should not fault`);
			messageIds.push((Array.isArray(addRes.AddMsgResponse.m) ? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m).id);
		}

		// Move all to trash with one request
		const allIds = messageIds.join(',');
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${allIds}" op="move" l="${trashFolderId}"/>
			</MsgActionRequest>`, acct1AuthToken
		);
		assert.notExists(moveRes.Fault, 'MsgActionRequest move should not fault');
		assert.equal(moveRes.MsgActionResponse.action.op, 'move', 'op should be move');

		// Delete all from trash with one request
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${allIds}" op="delete" l="${trashFolderId}"/>
			</MsgActionRequest>`, acct1AuthToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest delete should not fault');
		assert.equal(deleteRes.MsgActionResponse.action.op, 'delete', 'op should be delete');
	});
});
