import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Searchfolder Modify', function () {
	this.timeout(30 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetAccountInfoRequest xmlns="urn:zimbraAccount"><account by="name">' + accountEmail + '</account></GetAccountInfoRequest>', accountAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountInfoRequest should not fault');
		const mailHost = acctInfoRes.GetAccountInfoResponse.attr.find(a => a.name === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	async function createSearchFolder(query, types) {
		const name = `Search${common.getUniqueString()}`;
		const typesAttr = types ? ` types='${types}'` : '';
		const request =
			`<CreateSearchFolderRequest xmlns='urn:zimbraMail'>
				<search name='${name}' query='${query}'${typesAttr} sortBy='dateDesc' l='1'/>
			</CreateSearchFolderRequest>`;
		const response = await soap.makeSOAPEnvelopeAccount(request, accountAuthToken);
		assert.notExists(response.Fault, 'Create search folder should not be a Fault');

		return {
			id: response.CreateSearchFolderResponse.search[0].id,
			name: response.CreateSearchFolderResponse.search[0].name
		};
	}

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create Search Folder for query in - inbox and type message then modify search folder with query in - contacts', async () => {
		const sf = await createSearchFolder('in:inbox', 'message');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:contacts' types='message' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:contacts',
			'Verify query is modified to in:contacts');
		assert.equal(response.ModifySearchFolderResponse.search[0].name, sf.name,
			'Verify name is unchanged');
	});


	it('Sanity | Create Search Folder for query in - inbox and type conversation then modify search folder with query in - contacts', async () => {
		const sf = await createSearchFolder('in:inbox', 'conversation');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:contacts' types='conversation' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:contacts',
			'Verify query is modified');
	});


	it('Sanity | Create Search Folder for query in - contacts then modify search folder with query in - inbox and type message', async () => {
		const sf = await createSearchFolder('in:contacts');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:inbox' types='message' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:inbox',
			'Verify query is modified');
	});


	it('Sanity | Create Search Folder for query in - contacts then modify search folder with query in - inbox and type conversation', async () => {
		const sf = await createSearchFolder('in:contacts');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:inbox' types='conversation' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:inbox',
			'Verify query is modified');
	});


	it('Sanity | Create Search Folder for query in - sent and type message then modify search folder with query in - trash and type conversation', async () => {
		const sf = await createSearchFolder('in:sent', 'message');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:trash' types='conversation' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:trash',
			'Verify query is modified');
	});


	it('Sanity | Create Search Folder for query in - sent and type conversation then modify search folder with query in - trash and type message', async () => {
		const sf = await createSearchFolder('in:sent', 'conversation');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:trash' types='message' sortBy='dateDesc'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:trash',
			'Verify query is modified');
	});


	it('Sanity | Create Search Folder for query in - trash then modify search folder with query is - anywhere not in - trash', async () => {
		const sf = await createSearchFolder('in:trash', 'message');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='is:anywhere not in:trash'/>
			</ModifySearchFolderRequest>`;

		// ModifySearchFolderRequest
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'is:anywhere not in:trash',
			'Verify query is modified');
	});


	it('Sanity | Create Search Folder for query in - trash then modify search folder with query in - junk', async () => {
		const sf = await createSearchFolder('in:trash');

		const modifyRequest =
			`<ModifySearchFolderRequest xmlns='urn:zimbraMail'>
				<search id='${sf.id}' query='in:junk'/>
			</ModifySearchFolderRequest>`;
		const response = await soap.makeSOAPEnvelopeAccount(modifyRequest, accountAuthToken);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.equal(response.ModifySearchFolderResponse.search[0].id, sf.id,
			'Verify search folder id matches');
		assert.equal(response.ModifySearchFolderResponse.search[0].query, 'in:junk',
			'Verify query is modified');
	});

});
