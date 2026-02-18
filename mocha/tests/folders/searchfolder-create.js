import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folder > Search Folder > Create', function () {
    this.timeout(30 * 1000);
    let accountAuthToken;

    before(async function () {
        await main.before(this.ctx);
        const accountEmail = soap.testAccounts.testAccount1.emailAddress;
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
    });


    it('Sanity | Create search folder for query in:inbox type message', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].name, searchName,
            'Verify search folder name');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:inbox',
            'Verify search query');
    });


    it('Sanity | Create search folder for query in:inbox type conversation', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:inbox',
            'Verify search query');
    });


    it('Sanity | Create search folder for query in:contacts type message', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:contacts',
            'Verify search query');
    });


    it('Sanity | Create search folder for query in:contacts type conversation', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:contacts',
            'Verify search query');
    });


    it('Sanity | Create search folder for query in:sent type message', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:sent' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:sent',
            'Verify search query');
    });


    it('Sanity | Create search folder for query in:sent type conversation', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:sent' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:sent',
            'Verify search query');
    });


    it('Sanity | Create search folder for query in:trash type message', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:trash',
            'Verify search query');
    });

    it('Sanity | Create search folder for query in:trash type conversation', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:trash',
            'Verify search query');
    });


    it('Sanity | Create search folder with duplicate name', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        // Create first
        const request1 =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);

        // Create duplicate
        const request2 =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response2 = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken);

        assert.exists(response2.Fault, 'Verify Fault exists');
        assert.include(response2.Fault.Reason.Text, 'already exists',
            'Verify ALREADY_EXISTS error');
    });


    it('Regression | Create search folder with special characters', async () => {
        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name="':;~!@" query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.Fault, 'Verify Fault exists');
        assert.include(response.Fault.Reason.Text, 'invalid name',
            'Verify INVALID_NAME error');
    });


    it('Regression | Create search folder with name as numbers', async () => {
        const searchName = `12345${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:trash',
            'Verify search query');
    });


    it('Regression | Create search folder with blank name', async () => {
        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.Fault, 'Verify Fault exists');
        assert.include(response.Fault.Reason.Text, 'invalid name',
            'Verify INVALID_NAME error');
    });


    it('Regression | Create search folder with only spaces in name', async () => {
        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='             ' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.Fault, 'Verify Fault exists');
        assert.include(response.Fault.Reason.Text, 'invalid name',
            'Verify INVALID_NAME error');
    });


    it('Regression | Create search folder with spaces in name', async () => {
        const searchName = `Test${common.getUniqueString()}     .Test${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
    });


    it('Regression | Create search folder in Inbox', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='2'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].l, '2',
            'Verify search folder is in Inbox (l=2)');
    });


    it('Regression | Create search folder in Sent', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='5'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].l, '5',
            'Verify search folder is in Sent (l=5)');
    });


    it('Regression | Create search folder in Contacts', async () => {
        const searchName = `Search${common.getUniqueString()}`;

        const request =
            `<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='7'/>
			</CreateSearchFolderRequest>`;
        const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

        assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
        assert.equal(response.CreateSearchFolderResponse.search[0].l, '7',
            'Verify search folder is in Contacts (l=7)');
    });
});
