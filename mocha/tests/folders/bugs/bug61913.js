import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Bugs > Bug 61913', function () {
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
	it('Sanity | Login as the test account', async () => {
		const folderName = `bug61913_${common.getUniqueString()}`;

		// Create folder
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const folderId = createResponse.CreateFolderResponse.folder[0].id;

		// Update view to 'document'
		const updateRequest =
			`<FolderActionRequest xmlns='urn:zimbraMail'>
				<action op='update' id='${folderId}' view='document'/>
			</FolderActionRequest>`;
		const updateResponse = await soap.makeSOAPEnvelopeAccount(updateRequest, accountAuthToken);

		// Verify response
		assert.equal(updateResponse.FolderActionResponse.action.id, folderId,
			'Verify folder ID');
		assert.exists(updateResponse.FolderActionResponse.action, 'Action should exist');
	});

});
