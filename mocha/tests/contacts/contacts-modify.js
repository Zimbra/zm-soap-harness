import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Contacts > Contacts Modify', function () {
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
	it('Smoke | Modify a contact - change the email address', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@hotmail.com`;
		const newEmail = `email${common.getUniqueString()}@gmail.com`;

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
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${contactId}">
					<a n="email">${newEmail}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const attrs = getCn._attrs || {};
		const emailAttr = attrs.email || (getCn.a && (Array.isArray(getCn.a) ? getCn.a : [getCn.a]).find(a => a.n === 'email')?._content);
		assert.equal(emailAttr, newEmail, 'Email should be updated');
	});


	it('Sanity | Modify a contact - change each of the fields', async () => {
		const origAttrs = {
			firstName: `First${common.getUniqueString()}`,
			lastName: `Last${common.getUniqueString()}`,
			email: `email${common.getUniqueString()}@hotmail.com`,
			company: `Company${common.getUniqueString()}`,
			workFax: `wf${common.getUniqueString()}`,
			workPhone: `wp${common.getUniqueString()}`,
			middleName: `Mid${common.getUniqueString()}`
		};
		const newAttrs = {
			firstName: `NewFirst${common.getUniqueString()}`,
			lastName: `NewLast${common.getUniqueString()}`,
			email: `newemail${common.getUniqueString()}@hotmail.com`,
			company: `NewCompany${common.getUniqueString()}`,
			workFax: `newwf${common.getUniqueString()}`,
			workPhone: `newwp${common.getUniqueString()}`,
			middleName: `NewMid${common.getUniqueString()}`
		};

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${origAttrs.firstName}</a>
					<a n="lastName">${origAttrs.lastName}</a>
					<a n="email">${origAttrs.email}</a>
					<a n="company">${origAttrs.company}</a>
					<a n="workFax">${origAttrs.workFax}</a>
					<a n="workPhone">${origAttrs.workPhone}</a>
					<a n="middleName">${origAttrs.middleName}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="0">
				<cn id="${cn.id}">
					<a n="firstName">${newAttrs.firstName}</a>
					<a n="lastName">${newAttrs.lastName}</a>
					<a n="email">${newAttrs.email}</a>
					<a n="company">${newAttrs.company}</a>
					<a n="workFax">${newAttrs.workFax}</a>
					<a n="workPhone">${newAttrs.workPhone}</a>
					<a n="middleName">${newAttrs.middleName}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
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
		assert.equal(getAttr('firstName'), newAttrs.firstName, 'firstName should be updated');
		assert.equal(getAttr('email'), newAttrs.email, 'email should be updated');
	});


	it('Regression | Modify with replace=0 preserves unmodified fields, replace=1 clears them', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@hotmail.com</a>
					<a n="company">Company${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const newFirst = `NewFirst${common.getUniqueString()}`;
		const newLast = `NewLast${common.getUniqueString()}`;
		const newMiddle = `NewMiddle${common.getUniqueString()}`;

		// replace=0 should preserve existing fields
		const mod0Res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="firstName">${newFirst}</a>
					<a n="lastName">${newLast}</a>
					<a n="middleName">${newMiddle}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(mod0Res.Fault, 'Modify replace=0 should not be a Fault');

		// replace=1 should clear unspecified fields
		const mod1Res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="firstName">${newFirst}</a>
					<a n="lastName">${newLast}</a>
					<a n="middleName">${newMiddle}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(mod1Res.Fault, 'Modify replace=1 should not be a Fault');

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
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
		assert.equal(getAttr('firstName'), newFirst, 'firstName should match');
		assert.equal(getAttr('lastName'), newLast, 'lastName should match');
		assert.equal(getAttr('middleName'), newMiddle, 'middleName should match');
	});


	it('Regression | Modify a contact and delete all the info of contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@example.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}">
					<a n="firstName"/>
					<a n="lastName"/>
					<a n="email"/>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(modRes.Fault, 'Modify should be a Fault');
		const code = modRes.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Regression | Modify with replace=1 force=1 and empty fields returns fault', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const middleName = `Mid${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="middleName">${middleName}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1" force="1">
				<cn id="${cn.id}">
					<a n="firstName"/>
					<a n="lastName"/>
					<a n="middleName"/>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(modRes.Fault, 'Modify should be a Fault');
		const code = modRes.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Regression | Modify a contact with invalid fileAs options', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@example.com</a>
					<a n="fileAs">2</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		// fileAs=10 (invalid)
		const mod1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">10</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod1.Fault, 'fileAs=10 should be a Fault');

		// fileAs=alpha (invalid)
		const mod2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">abcd</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod2.Fault, 'fileAs=alpha should be a Fault');

		// fileAs=-1 (invalid)
		const mod3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">-1</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod3.Fault, 'fileAs=-1 should be a Fault');

		// fileAs=1.5 (invalid)
		const mod4 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">1.5</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod4.Fault, 'fileAs=1.5 should be a Fault');

		// fileAs=0 (valid)
		const mod5 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">0</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(mod5.Fault, 'fileAs=0 should not be a Fault');

		// fileAs=blank (valid)
		const mod6 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs"></a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(mod6.Fault, 'fileAs=blank should not be a Fault');
	});


	it('Sanity | Modify a contact to change fileAs to all allowed values (1-7)', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@example.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		for (const fileAs of ['1', '2', '3', '4', '5', '6', '7']) {
			const modRes = await soap.makeSOAPEnvelopeAccount(
				`<ModifyContactRequest xmlns="urn:zimbraMail">
					<cn id="${contactId}">
						<a n="fileAs">${fileAs}</a>
					</cn>
				</ModifyContactRequest>`, accountToken
			);
			assert.notExists(modRes.Fault, `fileAs=${fileAs} should not be a Fault`);
		}
	});


	it('Regression | Modify a contact with invalid id', async () => {
		// numeric id
		const mod1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="12345678">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod1.Fault, 'Numeric id should be a Fault');

		// alpha id
		const mod2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="abcd">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod2.Fault, 'Alpha id should be a Fault');

		// negative id
		const mod3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="-1">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod3.Fault, 'Negative id should be a Fault');

		// blank id
		const mod4 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.exists(mod4.Fault, 'Blank id should be a Fault');
	});


	it('Sanity | Modify a contact with verbose=0', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@hotmail.com`;
		const newEmail = `newemail${common.getUniqueString()}@gmail.com`;

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
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1" verbose="0">
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


	it('Regression | Modify contact with force=1 to add duplicate email', async () => {
		const email = `email${common.getUniqueString()}@domain.com`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="email">${email}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify with force should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | Modify contact to add nickname', async () => {
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

		const nickname = `nick${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="nickname">${nickname}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});


	it('Sanity | Modify contact phone number', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="mobilePhone">1234567890</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="mobilePhone">0987654321</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');
	});
});
