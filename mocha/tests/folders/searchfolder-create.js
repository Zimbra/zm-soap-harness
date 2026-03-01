import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Searchfolder Create', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Create Search Folder for query in - inbox and type message', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].name, searchName,
			'Verify search folder name');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:inbox',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - inbox and type conversation', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:inbox',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - contacts and type message', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:contacts',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - contacts and type conversation', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:contacts',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - sent and type message', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:sent' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:sent',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - sent and type conversation', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:sent' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:sent',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - trash and type message', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:trash',
			'Verify search query');
	});


	it('Sanity | Create Search Folder for query in - trash and type conversation', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:trash',
			'Verify search query');
	});


	it('Sanity | Create a folder with duplicate folder name', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		// Create first
		const request1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);

		// Create duplicate
		const request2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='message' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response2 = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken, false);

		// Verify response
		assert.exists(response2.Fault, 'Verify Fault exists');
		assert.include(response2.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});


	it('Regression | Create Search Folder with special characters', async () => {
		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name="':;~!@" query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken, false);

		// Verify response
		assert.exists(response.Fault, 'Verify Fault exists');
		assert.include(response.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Regression | Create Search Folder with name as numbers', async () => {
		const searchName = `12345${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].query, 'in:trash',
			'Verify search query');
	});


	it('Regression | Create Search Folder with name as blank', async () => {
		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken, false);

		// Verify response
		assert.exists(response.Fault, 'Verify Fault exists');
		assert.include(response.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Regression | Create Search Folder with name as only spaces', async () => {
		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name=' ' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken, false);

		// Verify response
		assert.exists(response.Fault, 'Verify Fault exists');
		assert.include(response.Fault.Reason.Text, 'invalid name',
			'Verify INVALID_NAME error');
	});


	it('Regression | Create Search Folder with name as only spaces 1', async () => {
		const searchName =
			`Test${common.getUniqueString()}     .Test${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
	});


	it('Regression | Create Search Folder in Inbox 1', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='2'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].l, '2',
			'Verify search folder is in Inbox (l=2)');
	});


	it('Regression | Create Search Folder in Inbox 2', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='5'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].l, '5',
			'Verify search folder is in Sent (l=5)');
	});


	it('Regression | Create Search Folder in Contacts folder', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:trash' types='conversation' sortBy='dateDesc' l='7'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSearchFolderResponse, 'Verify response exists');
		assert.equal(response.CreateSearchFolderResponse.search[0].l, '7',
			'Verify search folder is in Contacts (l=7)');
	});


	it('Sanity | Create Search Folder with duplicate name in conversation view', async () => {
		const searchName = `Search${common.getUniqueString()}`;

		// Create first in conversation view
		const request1 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:inbox' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;

		// CreateSearchFolderRequest
		await soap.makeSOAPEnvelopeAccount(request1, accountAuthToken);

		// Create duplicate in conversation view
		const request2 =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${searchName}' query='in:contacts' types='conversation' sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const response2 = await soap.makeSOAPEnvelopeAccount(request2, accountAuthToken, false);

		// Verify response
		assert.exists(response2.Fault, 'Verify Fault exists');
		assert.include(response2.Fault.Reason.Text, 'already exists',
			'Verify ALREADY_EXISTS error');
	});
});
