import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 67327', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let tag1Name, tag2Name, tag3Name;

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

		tag1Name = `tag1${common.getUniqueString()}`;
		tag2Name = `tag2${common.getUniqueString()}`;
		tag3Name = `tag3${common.getUniqueString()}`;

		const tag1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag1Name}"/>
			</CreateTagRequest>`, accountToken
		);
		const tag1 = Array.isArray(tag1Res.CreateTagResponse.tag)
			? tag1Res.CreateTagResponse.tag[0] : tag1Res.CreateTagResponse.tag;
		assert.exists(tag1.id, 'Tag1 id should exist');
		assert.equal(tag1.name, tag1Name, 'Tag1 name should match');

		const tag2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tag2Name}"/>
			</CreateTagRequest>`, accountToken
		);
		const tag2 = Array.isArray(tag2Res.CreateTagResponse.tag)
			? tag2Res.CreateTagResponse.tag[0] : tag2Res.CreateTagResponse.tag;
		assert.exists(tag2.id, 'Tag2 id should exist');
		assert.equal(tag2.name, tag2Name, 'Tag2 name should match');
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
		assert.exists(cn.id, 'Contact id should exist');

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
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.equal(modCn.tn, tag1Name, 'tn should match tag1');
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
		assert.exists(cn.id, 'Contact id should exist');

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
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.equal(modCn.tn, tag2Name, 'tn should match tag2');
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
		assert.exists(cn.id, 'Contact id should exist');

		// Modify the contact with replace=1
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.equal(modCn.tn, tag1Name, 'tn should still match tag1 after replace=1');

		// Modify with replace=0 and both tags
		const modRes2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}" tn="${tag1Name},${tag2Name}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes2.Fault, 'Modify with both tags should not fault');
		const modCn2 = Array.isArray(modRes2.ModifyContactResponse.cn)
			? modRes2.ModifyContactResponse.cn[0] : modRes2.ModifyContactResponse.cn;
		assert.include(modCn2.tn, tag1Name, 'tn should contain tag1');
		assert.include(modCn2.tn, tag2Name, 'tn should contain tag2');

		// Modify with replace=0 and only tag1
		const modRes3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}" tn="${tag1Name}">
					<a n="email">newemail${common.getUniqueString()}@gmail.com</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes3.Fault, 'Modify with tag1 only should not fault');
		const modCn3 = Array.isArray(modRes3.ModifyContactResponse.cn)
			? modRes3.ModifyContactResponse.cn[0] : modRes3.ModifyContactResponse.cn;
		assert.equal(modCn3.tn, tag1Name, 'tn should match tag1 only');
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
		assert.exists(cn.id, 'Contact id should exist');

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
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.tn, 'tn should exist');
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
		assert.exists(cn.id, 'Contact id should exist');

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
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.equal(modCn.tn, tag3Name, 'tn should match tag3');
	});
});
