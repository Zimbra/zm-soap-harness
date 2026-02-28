import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Bugs > Bug 85404', function () {
	let accountAuthToken;
	let testAccount;

	before(async function () {
		await main.before(this);
		testAccount = soap.testAccounts.testAccount1;
		accountAuthToken = await soap.getAccountAuthToken(testAccount.emailAddress);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | AbsFolderPath not returned in notification when a folder has moved', async () => {
		const folderName = `bug85404_${common.getUniqueString()}`;
		const rootId = '1';

		// 1. Create folder under Root
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='${rootId}'/>
			</CreateFolderRequest>`;

		// GetFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Verify absFolderPath is /folderName
		let getRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		let getResponse = await soap.makeSOAPEnvelopeAccount(getRequest, accountAuthToken);

		const findFolder = (folders, id) => {
			if (!folders) return null;
			if (Array.isArray(folders)) {
				for (let f of folders) {
					if (f.id === id) return f;
					const found = findFolder(f.folder, id);
					if (found) return found;
				}
			} else {
				if (folders.id === id) return folders;
				return findFolder(folders.folder, id);
			}
			return null;
		};

		let folder = findFolder(getResponse.GetFolderResponse.folder, folderId);

		// Verify response
		assert.equal(folder.absFolderPath, `/${folderName}`,
			'Verify absFolderPath after create');

		// 2. Rename folder
		const newName = `renamed_${common.getUniqueString()}`;
		const renameRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='rename' id='${folderId}' name='${newName}'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken);

		// Verify absFolderPath is /newName
		getResponse = await soap.makeSOAPEnvelopeAccount(getRequest, accountAuthToken);

		folder = findFolder(getResponse.GetFolderResponse.folder, folderId);

		// Verify response
		assert.equal(folder.absFolderPath, `/${newName}`,
			'Verify absFolderPath after rename');

		// 3. Move folder under Sent (ID 5)
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='5'/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// Verify absFolderPath is /Sent/newName
		getResponse = await soap.makeSOAPEnvelopeAccount(getRequest, accountAuthToken);

		folder = findFolder(getResponse.GetFolderResponse.folder, folderId);

		// Verify response
		assert.exists(folder, 'Folder should still exist after move');
		assert.include(folder.absFolderPath, newName,
			'Verify absFolderPath contains new name after move to Sent');
	});

});
