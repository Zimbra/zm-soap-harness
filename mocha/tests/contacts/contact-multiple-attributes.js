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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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
		assert.exists(res.CreateContactResponse.cn, 'Contact should be created');
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
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

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
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
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
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

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
		assert.exists(getRes.GetContactsResponse, 'GetContactsResponse should exist');
	});
});
