import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contacts Get', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Get contact with specific id', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
	});


	it('Functional | Get contact with non existing id', async () => {
		// Create and delete a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		// Delete the contact
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);

		// Get deleted contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountToken, false
		);
		assert.isString(getRes.Fault.Detail.Error.Code, 'Get deleted contact should be a Fault');
		const code = getRes.Fault.Detail.Error.Code;
		assert.include(code, 'mail.NO_SUCH_CONTACT', 'Error code should be mail.NO_SUCH_CONTACT');
	});


	it('Functional | Get contact with specific id leading space', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="   ${contactId}"/>
			</GetContactsRequest>`, accountToken, false
		);
		assert.isString(getRes.Fault.Detail.Error.Code, 'Get with leading space should be a Fault');
		const code = getRes.Fault.Detail.Error.Code;
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Functional | Get contact with specific id trailing space', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}   "/>
			</GetContactsRequest>`, accountToken, false
		);
		assert.isString(getRes.Fault.Detail.Error.Code, 'Get with trailing space should be a Fault');
		const code = getRes.Fault.Detail.Error.Code;
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Regression | Get contact with blank id', async () => {
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id=""/>
			</GetContactsRequest>`, accountToken, false
		);
		assert.isString(getRes.Fault.Detail.Error.Code, 'Get with blank id should be a Fault');
		const code = getRes.Fault.Detail.Error.Code;
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Sanity | GetContactsRequest with attribute filter', async () => {
		const email1 = `email${common.getUniqueString()}@domain.com`;
		const email2 = `email${common.getUniqueString()}@domain.com`;

		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="email">${email1}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="email">${email2}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<a n="email"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const cnArr = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn : [getRes.GetContactsResponse.cn];
		assert.isAbove(cnArr.length, 0, 'Should have at least one contact');
		assert.exists(cnArr[0].id, 'First contact should have an id');
	});


	it('Sanity | Get contact with specific id and sync', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
	});


	it('Sanity | Get contact with specific folder id and URL protection', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// Create folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Create contact in folder
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folderId}">
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');

		// Get contacts by folder
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" l="${folderId}">
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');

		// Create contact with javascript URLs
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folderId}">
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="homeUrl">javascript:alert(document.domain)//</a>
					<a n="otherUrl">javascript:alert(document.domain)//</a>
					<a n="workUrl">javascript:alert(document.domain)//</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes2.Fault, 'Create with JS URLs should not be a Fault');
		const cn2 = Array.isArray(createRes2.CreateContactResponse.cn)
			? createRes2.CreateContactResponse.cn[0] : createRes2.CreateContactResponse.cn;
		const contactId2 = cn2.id;

		// Get contact and verify URLs are blocked
		const getRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" l="${folderId}">
				<cn id="${contactId2}"></cn>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes2.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes2.GetContactsResponse.cn)
			? getRes2.GetContactsResponse.cn[0] : getRes2.GetContactsResponse.cn;
		const attrs = getCn._attrs || {};
		const getAttr = (name) => {
			if (attrs[name]) return attrs[name];
			if (getCn.a) {
				const arr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
				const found = arr.find(a => a.n === name);
				return found ? found._content : undefined;
			}
			return undefined;
		};
		assert.match(getAttr('homeUrl'), /^JAVASCRIPT-BLOCKED/, 'homeUrl should be blocked');
		assert.match(getAttr('otherUrl'), /^JAVASCRIPT-BLOCKED/, 'otherUrl should be blocked');
		assert.match(getAttr('workUrl'), /^JAVASCRIPT-BLOCKED/, 'workUrl should be blocked');
	});


	it('Functional | Get all contacts without specifying id', async () => {
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get all contacts should not be a Fault');
	});


	it('Sanity | Get contact with memberOf attribute', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" returnHiddenAttrs="1">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
	});


	it('Regression | Get contact with invalid alphabetic id', async () => {
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="abcdef"/>
			</GetContactsRequest>`, accountToken, false
		);
		assert.isString(getRes.Fault.Detail.Error.Code, 'Get with alpha id should be a Fault');
	});
});
