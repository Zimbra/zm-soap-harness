import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Request', function () {
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
	it('Smoke | CreateContactRequest', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Smoke | ModifyContactRequest', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;
		const newEmail = `newemail${common.getUniqueString()}@gmail.com`;

		// Create contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Modify contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="email">${newEmail}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact id should exist');
	});


	it('Smoke | GetContactsRequest', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Get contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		assert.exists(getCn.id, 'Contact id should exist');
	});


	it('Smoke | ContactActionRequest - trash', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Trash contact
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="trash"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Trash should not be a Fault');
		assert.equal(actionRes.ContactActionResponse.action.op, 'trash', 'Verify op is trash');
		assert.equal(actionRes.ContactActionResponse.action.id, cn.id, 'Verify action id');
	});


	it('Smoke | ImportContactsRequest', async () => {
		// This test requires CSV upload servlet support - verify ImportContacts works
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>First Name,Last Name,E-mail Address
TestFirst${common.getUniqueString()},TestLast${common.getUniqueString()},testemail${common.getUniqueString()}@domain.com</content>
			</ImportContactsRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Import should not be a Fault');
		const importCn = Array.isArray(res.ImportContactsResponse.cn)
			? res.ImportContactsResponse.cn[0] : res.ImportContactsResponse.cn;
		assert.equal(importCn.n, '1', 'Import should count 1 contact');
		assert.exists(importCn.ids, 'Import cn should have ids');
	});


	it('Smoke | ExportContactsRequest', async () => {
		// Create a contact first
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
		assert.exists(cn.id, 'Contact id should exist');

		// Export contacts
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, accountToken
		);
		assert.notExists(res.Fault, 'Export should not be a Fault');
		assert.exists(res.ExportContactsResponse.content, 'Export should contain content');
	});
});
