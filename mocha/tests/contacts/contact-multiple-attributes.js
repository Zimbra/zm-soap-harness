import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Multiple Attributes', function () {
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
	it('Sanity | Create contact with multiple same attributes', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

		// Create a contact
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
					<a n="userCertificate">${cert2}</a>
					<a n="userSMIMECertificate">${smime2}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Fetch contact via GetContactsRequest to verify multi-value attrs
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const cnAttrs = getCn._attrs || {};
		const smimeVals = Array.isArray(cnAttrs.userSMIMECertificate) ? cnAttrs.userSMIMECertificate : (cnAttrs.userSMIMECertificate ? [cnAttrs.userSMIMECertificate] : []);
		const certVals = Array.isArray(cnAttrs.userCertificate) ? cnAttrs.userCertificate : (cnAttrs.userCertificate ? [cnAttrs.userCertificate] : []);
		assert.isTrue(smimeVals.includes(smime1), 'userSMIMECertificate should contain smime1');
		assert.isTrue(smimeVals.includes(smime2), 'userSMIMECertificate should contain smime2');
		assert.isTrue(certVals.includes(cert1), 'userCertificate should contain cert1');
		assert.isTrue(certVals.includes(cert2), 'userCertificate should contain cert2');
	});


	it('Sanity | Modify contact with multiple same attributes', async () => {
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
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
					<a n="userCertificate" op="+">${cert2}</a>
					<a n="userSMIMECertificate" op="+">${smime2}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');

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
		const modSmimeVals = Array.isArray(modAttrs.userSMIMECertificate) ? modAttrs.userSMIMECertificate : (modAttrs.userSMIMECertificate ? [modAttrs.userSMIMECertificate] : []);
		const modCertVals = Array.isArray(modAttrs.userCertificate) ? modAttrs.userCertificate : (modAttrs.userCertificate ? [modAttrs.userCertificate] : []);
		assert.isTrue(modSmimeVals.includes(smime1), 'userSMIMECertificate should contain smime1');
		assert.isTrue(modSmimeVals.includes(smime2), 'userSMIMECertificate should contain smime2');
		assert.isTrue(modCertVals.includes(cert1), 'userCertificate should contain cert1');
		assert.isTrue(modCertVals.includes(cert2), 'userCertificate should contain cert2');
	});


	it('Sanity | Update contact with ContactActionRequest and multiple attributes', async () => {
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
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// Send contact action request
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="update">
					<a n="userCertificate">${cert1}</a>
					<a n="userSMIMECertificate">${smime1}</a>
					<a n="userCertificate">${cert2}</a>
					<a n="userSMIMECertificate">${smime2}</a>
				</action>
			</ContactActionRequest>`, accountToken
		);

		// Verify response
		assert.notExists(actionRes.Fault, 'ContactAction should not be a Fault');

		// Get the contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrs = getCn._attrs || {};
		const getSmimeVals = Array.isArray(getAttrs.userSMIMECertificate) ? getAttrs.userSMIMECertificate : (getAttrs.userSMIMECertificate ? [getAttrs.userSMIMECertificate] : []);
		const getCertVals = Array.isArray(getAttrs.userCertificate) ? getAttrs.userCertificate : (getAttrs.userCertificate ? [getAttrs.userCertificate] : []);
		assert.isTrue(getSmimeVals.includes(smime1), 'userSMIMECertificate should contain smime1');
		assert.isTrue(getSmimeVals.includes(smime2), 'userSMIMECertificate should contain smime2');
		assert.isTrue(getCertVals.includes(cert1), 'userCertificate should contain cert1');
		assert.isTrue(getCertVals.includes(cert2), 'userCertificate should contain cert2');
	});
});
