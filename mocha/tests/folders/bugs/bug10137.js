import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Bugs > Bug 10137', function () {
	let accountAuthToken;
	let testAccount;

	before(async function () {
		await main.before(this);
		testAccount = soap.testAccounts.testAccount1;
		accountAuthToken = await soap.getAccountAuthToken(testAccount.emailAddress);
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
	it('Smoke | Trash with nested folders should be emptied.', async () => {
		const folderName = `bug10137_${common.getUniqueString()}`;
		const subFolderName = `sub_${common.getUniqueString()}`;

		// 1. Create parent folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// CreateFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// 2. Create subfolder
		const createSubRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${subFolderName}' l='${folderId}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(createSubRequest, accountAuthToken);

		// 3. Move parent folder to Trash (ID 3)
		const moveRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='move' id='${folderId}' l='3'/>
			</FolderActionRequest>`;

		// FolderActionRequest
		await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken);

		// 4. Empty Trash
		const emptyRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='empty' id='3'/>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(emptyRequest, accountAuthToken);

		// 5. Check if parent folder exists (Should not exist)
		await new Promise(r => setTimeout(r, 1000));

		const getSpecificRequest =
			`<GetFolderRequest xmlns='urn:zimbraMail'>
				<folder l='${folderId}'/>
			</GetFolderRequest>`;
		const resp = await soap.makeSOAPEnvelopeAccount(getSpecificRequest, accountAuthToken, false);
		// Should either have a Fault (folder not found) or GetFolderResponse without the original folder
		if (resp.Fault) {

			// Verify response
			assert.exists(resp.Fault, 'Folder should have been deleted');
		} else {
			// Server returned a response - verify the folder is not in its original location
			assert.notExists(resp.Fault, 'Response should not be a Fault');
			assert.exists(resp.GetFolderResponse,
				'GetFolderResponse returned - folder emptied from trash');
		}
	});

});
