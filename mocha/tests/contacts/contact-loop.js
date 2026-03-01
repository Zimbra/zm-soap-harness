import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Loop', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, accountEmail, accountToken, searchContactId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);

		// Create a searchable contact for other tests
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">SearchFirst</a>
					<a n="lastName">SearchLast</a>
					<a n="email">SearchEmail@${config.testDomain}</a>
					<a n="company">SearchCompany</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(searchRes.CreateContactResponse.cn)
			? searchRes.CreateContactResponse.cn[0] : searchRes.CreateContactResponse.cn;
		searchContactId = cn.id;
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
	it('Functional | Create 100 contacts in bulk', async () => {
		for (let i = 0; i < 100; i++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">email${common.getUniqueString()}@domain.com</a>
						<a n="company">zimbra</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
			assert.notExists(res.Fault, `Contact ${i + 1} should not be a Fault`);
		}

		// Verify with GetInfoRequest
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount"/>`, accountToken
		);
		assert.notExists(infoRes.Fault, 'GetInfo should not be a Fault');
	});


	it('Functional | Get a contact from large list', async () => {
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${searchContactId}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		assert.exists(getRes.GetContactsResponse, 'GetContactsResponse should exist');
	});


	it('Functional | Search a contact from large list', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>SearchFirst</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search non-existing contact from large list', async () => {
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>NonExisting${common.getUniqueString()}</query>
			</SearchRequest>`, accountToken
		);
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Tag a contact from large list', async () => {
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="Tag${common.getUniqueString()}" color="1"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchContactId}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Tag should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, 'tag', 'Op should be tag');
	});


	it('Functional | Untag a contact from large list', async () => {
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="Tag${common.getUniqueString()}" color="1"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchContactId}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);

		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchContactId}" op="!tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Untag should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, '!tag', 'Op should be !tag');
	});


	it('Functional | Move a contact from large list', async () => {
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountToken
		);
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;

		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchContactId}" op="move" l="${folder.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Move should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, 'move', 'Op should be move');
	});


	it('Functional | Flag a contact from large list', async () => {
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchContactId}" op="flag"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Flag should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, 'flag', 'Op should be flag');
	});


	it('Functional | Unflag a contact from large list', async () => {
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${searchContactId}" op="!flag"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Unflag should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, '!flag', 'Op should be !flag');
	});


	it('Functional | Delete a contact from large list', async () => {
		// Create a contact to delete (don't delete the search contact)
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">DeleteMe${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Delete should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, 'delete', 'Op should be delete');
	});
});
