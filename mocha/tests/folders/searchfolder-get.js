import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Searchfolder Get', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this.ctx);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create Search Folder for query in - inbox and type message', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		// Create search folder
		const createRequest =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// GetSearchFolderRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

		// Verify response
		assert.notExists(createResponse.Fault, 'Response should not be a Fault');
		assert.exists(createResponse.CreateSearchFolderResponse,
			'Verify create response exists');
		assert.equal(createResponse.CreateSearchFolderResponse.search[0].name, searchName,
			'Verify search folder name');
		assert.equal(createResponse.CreateSearchFolderResponse.search[0].query, 'in:inbox',
			'Verify search query');

		// Get search folder
		const getRequest = '<GetSearchFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const getResponse = await soap.makeSOAPEnvelopeAccount(getRequest, accountAuthToken);

		// Verify response
		assert.notExists(getResponse.Fault, 'Response should not be a Fault');
		assert.exists(getResponse.GetSearchFolderResponse, 'Verify get response exists');
	});

});
