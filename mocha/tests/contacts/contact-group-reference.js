import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Contacts > Contact Group Reference', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account3Email;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create contact group reference with type I (inline member)', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="nickname">${nickname}</a>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Create should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Sanity | Create contact group reference with type C (contact reference)', async () => {
		const nickname = `contact${common.getUniqueString()}`;

		// Create a contact to reference
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="nickname">${nickname}</a>
					<m type="C" value="${refCn.id}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Create should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact group id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Smoke | Search contact group using AutoCompleteRequest', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="nickname">${nickname}</a>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const autoRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${nickname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(autoRes.Fault, 'AutoComplete should not be a Fault');
		assert.exists(autoRes.AutoCompleteResponse, 'AutoCompleteResponse should exist');
	});


	it('Sanity | Create contact group reference with mixed types C and I', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create a contact to reference
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="nickname">${nickname}</a>
					<m type="C" value="${refCn.id}"/>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Create should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact group id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});
});
