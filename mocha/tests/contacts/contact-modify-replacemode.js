import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Modify Replacemode', function () {
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
	it('Smoke | Modify with replace=0 and op="+" adds multi-value attributes', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate" op="+">${cert2}</a>
					<a n="userSMIMECertificate" op="+">${smime2}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact id should exist');

		// Fetch contact via GetContactsRequest to verify multi-value attrs
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const modAttrs = getCn._attrs || {};
		const smimeVals = Array.isArray(modAttrs.userSMIMECertificate) ? modAttrs.userSMIMECertificate : (modAttrs.userSMIMECertificate ? [modAttrs.userSMIMECertificate] : []);
		assert.include(smimeVals, smime1, 'Original smime should still exist');
		assert.include(smimeVals, smime2, 'New smime should be added');
		const certVals = Array.isArray(modAttrs.userCertificate) ? modAttrs.userCertificate : (modAttrs.userCertificate ? [modAttrs.userCertificate] : []);
		assert.include(certVals, cert1, 'Original cert should still exist');
		assert.include(certVals, cert2, 'New cert should be added');
	});


	it('Sanity | Modify to remove previous and add new multi-value attributes', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate"></a>
					<a n="userSMIMECertificate"></a>
					<a n="userCertificate" op="+">${cert2}</a>
					<a n="userSMIMECertificate" op="+">${smime2}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact ID should exist');

		// Fetch contact via GetContactsRequest to verify multi-value attrs
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const modAttrs = getCn._attrs || {};
		const smimeVals = Array.isArray(modAttrs.userSMIMECertificate) ? modAttrs.userSMIMECertificate : (modAttrs.userSMIMECertificate ? [modAttrs.userSMIMECertificate] : []);
		assert.include(smimeVals, smime2, 'New smime2 should exist');
		const certVals = Array.isArray(modAttrs.userCertificate) ? modAttrs.userCertificate : (modAttrs.userCertificate ? [modAttrs.userCertificate] : []);
		assert.include(certVals, cert2, 'New cert2 should exist');
	});


	it('Sanity | Modify to remove all added multi-value attributes', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate" op="+">${cert2}</a>
					<a n="userSMIMECertificate" op="+">${smime2}</a>
					<a n="userCertificate"></a>
					<a n="userSMIMECertificate"></a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact ID should exist');
		const modAttrs = modCn._attrs || {};
		assert.notExists(modAttrs.userSMIMECertificate, 'userSMIMECertificate should be removed');
		assert.notExists(modAttrs.userCertificate, 'userCertificate should be removed');
	});


	it('Sanity | Modify with op="+" and empty value throws invalid request', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const mod1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate" op="+"></a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod1.Fault.Detail.Error.Code, 'Empty userCertificate op=+ should be a Fault');
		const code1 = mod1.Fault.Detail.Error.Code;
		assert.include(code1, 'service.INVALID_REQUEST', 'Error should be INVALID_REQUEST');

		// Modify the contact
		const mod2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userSMIMECertificate" op="+"></a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod2.Fault.Detail.Error.Code, 'Empty userSMIMECertificate op=+ should be a Fault');
		const code2 = mod2.Fault.Detail.Error.Code;
		assert.include(code2, 'service.INVALID_REQUEST', 'Error should be INVALID_REQUEST');
	});


	it('Sanity | Modify with replace=1 replaces attribute values', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="userCertificate">${cert2}</a>
					<a n="userSMIMECertificate">${smime2}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact id should exist');

		// Fetch contact via GetContactsRequest to verify multi-value attrs
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const modAttrs = getCn._attrs || {};
		const smimeVals = Array.isArray(modAttrs.userSMIMECertificate) ? modAttrs.userSMIMECertificate : (modAttrs.userSMIMECertificate ? [modAttrs.userSMIMECertificate] : []);
		assert.notInclude(smimeVals, smime1, 'Old smime1 should not exist after replace=1');
		assert.include(smimeVals, smime2, 'New smime2 should exist after replace=1');
		const certVals = Array.isArray(modAttrs.userCertificate) ? modAttrs.userCertificate : (modAttrs.userCertificate ? [modAttrs.userCertificate] : []);
		assert.notInclude(certVals, cert1, 'Old cert1 should not exist after replace=1');
		assert.include(certVals, cert2, 'New cert2 should exist after replace=1');
	});
});
