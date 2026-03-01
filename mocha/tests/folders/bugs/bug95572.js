import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Bugs > Bug 95572', function () {
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
	it('Sanity | Create a folder with fie 1 ie no parent folder', async () => {
		const folderName = `bug95572_${common.getUniqueString()}`;

		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${folderName}' l='1' fie='1'/>
			</CreateFolderRequest>`;

		// Perform SOAP request
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.exists(createResponse.CreateFolderResponse.folder[0].id,
			'Folder should be created with fie=1');
	});

});
