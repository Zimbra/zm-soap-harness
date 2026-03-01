import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Contacts > Contact Modify Replace Mode', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountToken = await soap.getAccountAuthToken(accountEmail);
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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate" op="+">${cert2}</a>
					<a n="userSMIMECertificate" op="+">${smime2}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse.cn, 'Modified contact should exist');
	});


	it('Sanity | Modify to remove previous and add new multi-value attributes', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

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
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | Modify to remove all added multi-value attributes', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

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
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | Modify with op="+" and empty value throws invalid request', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;

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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// op="+" with empty userCertificate
		const mod1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userCertificate" op="+"></a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod1.Fault, 'Empty userCertificate op=+ should be a Fault');
		const code1 = mod1.Fault?.Detail?.Error?.Code || '';
		assert.include(code1, 'service.INVALID_REQUEST', 'Error should be INVALID_REQUEST');

		// op="+" with empty userSMIMECertificate
		const mod2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="userSMIMECertificate" op="+"></a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod2.Fault, 'Empty userSMIMECertificate op=+ should be a Fault');
		const code2 = mod2.Fault?.Detail?.Error?.Code || '';
		assert.include(code2, 'service.INVALID_REQUEST', 'Error should be INVALID_REQUEST');
	});


	it('Sanity | Modify with replace=1 replaces attribute values', async () => {
		const cert1 = `Cert1${common.getUniqueString()}`;
		const smime1 = `Smime1${common.getUniqueString()}`;
		const cert2 = `Cert2${common.getUniqueString()}`;
		const smime2 = `Smime2${common.getUniqueString()}`;

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
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="userCertificate">${cert2}</a>
					<a n="userSMIMECertificate">${smime2}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse.cn, 'Modified contact should exist');
	});
});
