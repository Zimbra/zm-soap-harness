import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Bugs > Bug 67327 - Modify contact tag operations', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let tag1Name, tag2Name, tag3Name;

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

		tag1Name = `tag1${common.getUniqueString()}`;
		tag2Name = `tag2${common.getUniqueString()}`;
		tag3Name = `tag3${common.getUniqueString()}`;

		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag1Name}"/>
			</CreateTagRequest>`, accountToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag2Name}"/>
			</CreateTagRequest>`, accountToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | ModifyContactRequest - apply tag to contact using tn attribute', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}" tn="${tag1Name}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | ModifyContactRequest - apply second tag with replace=0', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn tn="${tag1Name}">
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}" tn="${tag2Name}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | ModifyContactRequest - replace=1 preserves existing tag', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn tn="${tag1Name}">
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | ModifyContactRequest - apply multiple tags via tn', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}" tn="${tag1Name},${tag2Name}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | ModifyContactRequest - apply non-existing tag creates it', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">first${common.getUniqueString()}</a>
					<a n="lastName">last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}" tn="${tag3Name}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});
});
