import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folder > Search Folder > Get', function () {
    this.timeout(30 * 1000);
    let accountAuthToken;

    before(async function () {
        await main.before(this.ctx);
        const accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
    });


    it('Smoke | Create and get search folder', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        // Create search folder
        const createRequest =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);

        assert.exists(createResponse.CreateSearchFolderResponse, 'Verify create response exists');
        assert.equal(createResponse.CreateSearchFolderResponse.search[0].name, searchName,
            'Verify search folder name');
        assert.equal(createResponse.CreateSearchFolderResponse.search[0].query, 'in:inbox',
            'Verify search query');

        // Get search folder
        const getRequest =
            `<GetSearchFolderRequest xmlns='urn:zimbraMail'/>`;
        const getResponse = await soap.makeSOAPEnvelopeAccount(getRequest, accountAuthToken);

        assert.exists(getResponse.GetSearchFolderResponse, 'Verify get response exists');
    });
});
