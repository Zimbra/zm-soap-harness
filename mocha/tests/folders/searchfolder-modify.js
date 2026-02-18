import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folder > Search Folder > Modify', function () {
    this.timeout(30 * 1000);
    let accountAuthToken;

    before(async function () {
        await main.before(this.ctx);
        const accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
    });


    async function createSearchFolder(query, types) {
        const name = `Search${common.getUniqueString()}`;
        const typesAttr = types ? ` types='${types}'` : '';
        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${name}' query='${query}'${typesAttr} sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);
        return {
            id: response.CreateSearchFolderResponse.search[0].id,
            name: response.CreateSearchFolderResponse.search[0].name
        };
    }


    it('Sanity | Modify search folder query from in:inbox to in:contacts (type message)', async () => {
        const sf = await createSearchFolder('in:inbox', 'message');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:contacts' types='message' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:contacts',
            'Verify query is modified to in:contacts');
        assert.equal(response.ModifySearchFolderResponse.search[0].name, sf.name,
            'Verify name is unchanged');
    });


    it('Sanity | Modify search folder query from in:inbox to in:contacts (type conversation)', async () => {
        const sf = await createSearchFolder('in:inbox', 'conversation');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:contacts' types='conversation' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:contacts',
            'Verify query is modified');
    });


    it('Sanity | Modify search folder query from in:contacts to in:inbox (type message)', async () => {
        const sf = await createSearchFolder('in:contacts');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:inbox' types='message' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:inbox',
            'Verify query is modified');
    });


    it('Sanity | Modify search folder query from in:contacts to in:inbox (type conversation)', async () => {
        const sf = await createSearchFolder('in:contacts');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:inbox' types='conversation' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:inbox',
            'Verify query is modified');
    });


    it('Sanity | Modify search folder query from in:sent to in:trash', async () => {
        const sf = await createSearchFolder('in:sent', 'message');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:trash' types='conversation' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:trash',
            'Verify query is modified');
    });


    it('Sanity | Modify search folder query from in:sent (conversation) to in:trash (message)', async () => {
        const sf = await createSearchFolder('in:sent', 'conversation');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:trash' types='message' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:trash',
            'Verify query is modified');
    });


    it('Sanity | Modify search folder query to is:anywhere not in:trash', async () => {
        const sf = await createSearchFolder('in:trash', 'message');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='is:anywhere not in:trash'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'is:anywhere not in:trash',
            'Verify query is modified');
    });


    it('Sanity | Modify search folder query from in:trash to in:junk', async () => {
        const sf = await createSearchFolder('in:trash');

        const modifyRequest =
            `<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:junk'/>
			</ModifySearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

        assert.exists(response.ModifySearchFolderResponse, 'Verify response exists');
        assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:junk',
            'Verify query is modified');
    });
});
