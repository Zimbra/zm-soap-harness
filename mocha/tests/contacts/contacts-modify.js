import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contacts Modify', function () {
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
	it('Smoke | Modify a contact - change the email address', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@hotmail.com`;
		const newEmail = `email${common.getUniqueString()}@gmail.com`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;
		assert.exists(contactId, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${contactId}">
					<a n="email">${newEmail}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');

		// Get the contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrArr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
		const emailVal = getAttrArr.find(a => a.n === 'email');
		assert.exists(emailVal, 'email attr should exist');
		assert.equal(emailVal._content, newEmail, 'Email should be updated');
	});


	it('Sanity | Modify a contact - change each of the fields', async () => {
		const origAttrs = {
			firstName: `First${common.getUniqueString()}`,
			lastName: `Last${common.getUniqueString()}`,
			email: `email${common.getUniqueString()}@hotmail.com`,
			company: `Company${common.getUniqueString()}`,
			workFax: `wf${common.getUniqueString()}`,
			workPhone2: `wp2${common.getUniqueString()}`,
			callbackPhone: `cb${common.getUniqueString()}`,
			carPhone: `car${common.getUniqueString()}`,
			homePhone2: `hp2${common.getUniqueString()}`,
			homeFax: `hf${common.getUniqueString()}`,
			otherPhone: `op${common.getUniqueString()}`,
			otherFax: `of${common.getUniqueString()}`,
			email1: `email1${common.getUniqueString()}@yahoo.com`,
			email2: `email2${common.getUniqueString()}@example.com`,
			email3: `email3${common.getUniqueString()}@persistent.co.in`,
			middleName: `Mid${common.getUniqueString()}`,
			jobTitle: `Title${common.getUniqueString()}`,
			workPhone: `wp${common.getUniqueString()}`,
			homePhone: `hp${common.getUniqueString()}`,
			mobilePhone: `mob${common.getUniqueString()}`,
			pager: `pager${common.getUniqueString()}`,
			workStreet: `wStreet${common.getUniqueString()}`,
			workCity: `wCity${common.getUniqueString()}`,
			workState: `wState${common.getUniqueString()}`,
			workPostalCode: `wPostal${common.getUniqueString()}`,
			workCountry: `wCountry${common.getUniqueString()}`,
			workURL: `wUrl${common.getUniqueString()}`,
			notes: `notes${common.getUniqueString()}`
		};
		const newAttrs = {
			firstName: `NewFirst${common.getUniqueString()}`,
			lastName: `NewLast${common.getUniqueString()}`,
			email: `newemail${common.getUniqueString()}@hotmail.com`,
			company: `NewCompany${common.getUniqueString()}`,
			workFax: `newwf${common.getUniqueString()}`,
			workPhone2: `newwp2${common.getUniqueString()}`,
			callbackPhone: `newcb${common.getUniqueString()}`,
			carPhone: `newcar${common.getUniqueString()}`,
			homePhone2: `newhp2${common.getUniqueString()}`,
			homeFax: `newhf${common.getUniqueString()}`,
			otherPhone: `newop${common.getUniqueString()}`,
			otherFax: `newof${common.getUniqueString()}`,
			email1: `newemail1${common.getUniqueString()}@yahoo.com`,
			email2: `newemail2${common.getUniqueString()}@example.com`,
			email3: `newemail3${common.getUniqueString()}@persistent.co.in`,
			middleName: `NewMid${common.getUniqueString()}`,
			jobTitle: `NewTitle${common.getUniqueString()}`,
			workPhone: `newwp${common.getUniqueString()}`,
			homePhone: `newhp${common.getUniqueString()}`,
			mobilePhone: `newmob${common.getUniqueString()}`,
			pager: `newpager${common.getUniqueString()}`,
			workStreet: `newwStreet${common.getUniqueString()}`,
			workCity: `newwCity${common.getUniqueString()}`,
			workState: `newwState${common.getUniqueString()}`,
			workPostalCode: `newwPostal${common.getUniqueString()}`,
			workCountry: `newwCountry${common.getUniqueString()}`,
			workURL: `newwUrl${common.getUniqueString()}`,
			notes: `newnotes${common.getUniqueString()}`
		};

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${origAttrs.firstName}</a>
					<a n="lastName">${origAttrs.lastName}</a>
					<a n="email">${origAttrs.email}</a>
					<a n="company">${origAttrs.company}</a>
					<a n="workFax">${origAttrs.workFax}</a>
					<a n="workPhone2">${origAttrs.workPhone2}</a>
					<a n="callbackPhone">${origAttrs.callbackPhone}</a>
					<a n="carPhone">${origAttrs.carPhone}</a>
					<a n="homePhone2">${origAttrs.homePhone2}</a>
					<a n="homeFax">${origAttrs.homeFax}</a>
					<a n="otherPhone">${origAttrs.otherPhone}</a>
					<a n="otherFax">${origAttrs.otherFax}</a>
					<a n="email1">${origAttrs.email1}</a>
					<a n="email2">${origAttrs.email2}</a>
					<a n="email3">${origAttrs.email3}</a>
					<a n="middleName">${origAttrs.middleName}</a>
					<a n="jobTitle">${origAttrs.jobTitle}</a>
					<a n="workPhone">${origAttrs.workPhone}</a>
					<a n="homePhone">${origAttrs.homePhone}</a>
					<a n="mobilePhone">${origAttrs.mobilePhone}</a>
					<a n="pager">${origAttrs.pager}</a>
					<a n="workStreet">${origAttrs.workStreet}</a>
					<a n="workCity">${origAttrs.workCity}</a>
					<a n="workState">${origAttrs.workState}</a>
					<a n="workPostalCode">${origAttrs.workPostalCode}</a>
					<a n="workCountry">${origAttrs.workCountry}</a>
					<a n="workURL">${origAttrs.workURL}</a>
					<a n="notes">${origAttrs.notes}</a>
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
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="0">
				<cn id="${cn.id}">
					<a n="firstName">${newAttrs.firstName}</a>
					<a n="lastName">${newAttrs.lastName}</a>
					<a n="email">${newAttrs.email}</a>
					<a n="company">${newAttrs.company}</a>
					<a n="workFax">${newAttrs.workFax}</a>
					<a n="workPhone2">${newAttrs.workPhone2}</a>
					<a n="callbackPhone">${newAttrs.callbackPhone}</a>
					<a n="carPhone">${newAttrs.carPhone}</a>
					<a n="homePhone2">${newAttrs.homePhone2}</a>
					<a n="homeFax">${newAttrs.homeFax}</a>
					<a n="otherPhone">${newAttrs.otherPhone}</a>
					<a n="otherFax">${newAttrs.otherFax}</a>
					<a n="email1">${newAttrs.email1}</a>
					<a n="email2">${newAttrs.email2}</a>
					<a n="email3">${newAttrs.email3}</a>
					<a n="middleName">${newAttrs.middleName}</a>
					<a n="jobTitle">${newAttrs.jobTitle}</a>
					<a n="workPhone">${newAttrs.workPhone}</a>
					<a n="homePhone">${newAttrs.homePhone}</a>
					<a n="mobilePhone">${newAttrs.mobilePhone}</a>
					<a n="pager">${newAttrs.pager}</a>
					<a n="workStreet">${newAttrs.workStreet}</a>
					<a n="workCity">${newAttrs.workCity}</a>
					<a n="workState">${newAttrs.workState}</a>
					<a n="workPostalCode">${newAttrs.workPostalCode}</a>
					<a n="workCountry">${newAttrs.workCountry}</a>
					<a n="workURL">${newAttrs.workURL}</a>
					<a n="notes">${newAttrs.notes}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');

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
		const getAttrArr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
		const getAttr = (name) => {
			const found = getAttrArr.find(a => a.n === name);
			return found ? found._content : undefined;
		};
		assert.equal(getAttr('email'), newAttrs.email, 'email should be updated');
		assert.equal(getAttr('firstName'), newAttrs.firstName, 'firstName should be updated');
		assert.equal(getAttr('lastName'), newAttrs.lastName, 'lastName should be updated');
		assert.equal(getAttr('company'), newAttrs.company, 'company should be updated');
		assert.equal(getAttr('workFax'), newAttrs.workFax, 'workFax should be updated');
		assert.equal(getAttr('workPhone2'), newAttrs.workPhone2, 'workPhone2 should be updated');
		assert.equal(getAttr('callbackPhone'), newAttrs.callbackPhone, 'callbackPhone should be updated');
		assert.equal(getAttr('carPhone'), newAttrs.carPhone, 'carPhone should be updated');
		assert.equal(getAttr('homePhone2'), newAttrs.homePhone2, 'homePhone2 should be updated');
		assert.equal(getAttr('homeFax'), newAttrs.homeFax, 'homeFax should be updated');
		assert.equal(getAttr('otherPhone'), newAttrs.otherPhone, 'otherPhone should be updated');
		assert.equal(getAttr('otherFax'), newAttrs.otherFax, 'otherFax should be updated');
		assert.equal(getAttr('email1'), newAttrs.email1, 'email1 should be updated');
		assert.equal(getAttr('email2'), newAttrs.email2, 'email2 should be updated');
		assert.equal(getAttr('email3'), newAttrs.email3, 'email3 should be updated');
		assert.equal(getAttr('middleName'), newAttrs.middleName, 'middleName should be updated');
		assert.equal(getAttr('jobTitle'), newAttrs.jobTitle, 'jobTitle should be updated');
		assert.equal(getAttr('workPhone'), newAttrs.workPhone, 'workPhone should be updated');
		assert.equal(getAttr('homePhone'), newAttrs.homePhone, 'homePhone should be updated');
		assert.equal(getAttr('mobilePhone'), newAttrs.mobilePhone, 'mobilePhone should be updated');
		assert.equal(getAttr('pager'), newAttrs.pager, 'pager should be updated');
		assert.equal(getAttr('workStreet'), newAttrs.workStreet, 'workStreet should be updated');
		assert.equal(getAttr('workCity'), newAttrs.workCity, 'workCity should be updated');
		assert.equal(getAttr('workState'), newAttrs.workState, 'workState should be updated');
		assert.equal(getAttr('workPostalCode'), newAttrs.workPostalCode, 'workPostalCode should be updated');
		assert.equal(getAttr('workCountry'), newAttrs.workCountry, 'workCountry should be updated');
		assert.equal(getAttr('workURL'), newAttrs.workURL, 'workURL should be updated');
		assert.equal(getAttr('notes'), newAttrs.notes, 'notes should be updated');
	});


	it('Regression | Modify with replace=0 preserves unmodified fields, replace=1 clears them', async () => {
		const origEmail = `email${common.getUniqueString()}@hotmail.com`;
		const origCompany = `Company${common.getUniqueString()}`;
		const origWorkFax = `wf${common.getUniqueString()}`;

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">${origEmail}</a>
					<a n="company">${origCompany}</a>
					<a n="workFax">${origWorkFax}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		const newFirst = `NewFirst${common.getUniqueString()}`;
		const newLast = `NewLast${common.getUniqueString()}`;
		const newMiddle = `NewMiddle${common.getUniqueString()}`;

		// Modify the contact with replace=0
		const mod0Res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${cn.id}">
					<a n="firstName">${newFirst}</a>
					<a n="lastName">${newLast}</a>
					<a n="middleName">${newMiddle}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(mod0Res.Fault, 'Modify replace=0 should not be a Fault');
		const mod0Cn = Array.isArray(mod0Res.ModifyContactResponse.cn)
			? mod0Res.ModifyContactResponse.cn[0] : mod0Res.ModifyContactResponse.cn;
		assert.exists(mod0Cn.id, 'ModifyContactResponse cn id should exist');

		// Get contact after replace=0 — unmodified fields should still exist
		const get0Res = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(get0Res.Fault, 'Get after replace=0 should not be a Fault');
		const get0Cn = Array.isArray(get0Res.GetContactsResponse.cn)
			? get0Res.GetContactsResponse.cn[0] : get0Res.GetContactsResponse.cn;
		const get0Arr = Array.isArray(get0Cn.a) ? get0Cn.a : [get0Cn.a];
		const get0Attr = (name) => {
			const found = get0Arr.find(a => a.n === name);
			return found ? found._content : undefined;
		};
		assert.equal(get0Attr('firstName'), newFirst, 'firstName should be updated after replace=0');
		assert.equal(get0Attr('lastName'), newLast, 'lastName should be updated after replace=0');
		assert.equal(get0Attr('middleName'), newMiddle, 'middleName should be added after replace=0');
		assert.equal(get0Attr('email'), origEmail, 'email should be preserved after replace=0');
		assert.equal(get0Attr('company'), origCompany, 'company should be preserved after replace=0');
		assert.equal(get0Attr('workFax'), origWorkFax, 'workFax should be preserved after replace=0');

		// Modify the contact with replace=1
		const mod1Res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${cn.id}">
					<a n="firstName">${newFirst}</a>
					<a n="lastName">${newLast}</a>
					<a n="middleName">${newMiddle}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(mod1Res.Fault, 'Modify replace=1 should not be a Fault');
		const mod1Cn = Array.isArray(mod1Res.ModifyContactResponse.cn)
			? mod1Res.ModifyContactResponse.cn[0] : mod1Res.ModifyContactResponse.cn;
		assert.exists(mod1Cn.id, 'ModifyContactResponse cn id should exist');

		// Get the contact after replace=1 — only sent fields should remain
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrArr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
		const getAttr = (name) => {
			const found = getAttrArr.find(a => a.n === name);
			return found ? found._content : undefined;
		};
		assert.equal(getAttr('firstName'), newFirst, 'firstName should match after replace=1');
		assert.equal(getAttr('lastName'), newLast, 'lastName should match after replace=1');
		assert.equal(getAttr('middleName'), newMiddle, 'middleName should match after replace=1');
		const emailAfter = getAttrArr.find(a => a.n === 'email');
		assert.notExists(emailAfter, 'email should not exist after replace=1');
		const companyAfter = getAttrArr.find(a => a.n === 'company');
		assert.notExists(companyAfter, 'company should not exist after replace=1');
		const workFaxAfter = getAttrArr.find(a => a.n === 'workFax');
		assert.notExists(workFaxAfter, 'workFax should not exist after replace=1');
		const workPhone2After = getAttrArr.find(a => a.n === 'workPhone2');
		assert.notExists(workPhone2After, 'workPhone2 should not exist after replace=1');
		const callbackPhoneAfter = getAttrArr.find(a => a.n === 'callbackPhone');
		assert.notExists(callbackPhoneAfter, 'callbackPhone should not exist after replace=1');
		const carPhoneAfter = getAttrArr.find(a => a.n === 'carPhone');
		assert.notExists(carPhoneAfter, 'carPhone should not exist after replace=1');
		const homePhone2After = getAttrArr.find(a => a.n === 'homePhone2');
		assert.notExists(homePhone2After, 'homePhone2 should not exist after replace=1');
		const homeFaxAfter = getAttrArr.find(a => a.n === 'homeFax');
		assert.notExists(homeFaxAfter, 'homeFax should not exist after replace=1');
		const otherPhoneAfter = getAttrArr.find(a => a.n === 'otherPhone');
		assert.notExists(otherPhoneAfter, 'otherPhone should not exist after replace=1');
		const otherFaxAfter = getAttrArr.find(a => a.n === 'otherFax');
		assert.notExists(otherFaxAfter, 'otherFax should not exist after replace=1');
		const email1After = getAttrArr.find(a => a.n === 'email1');
		assert.notExists(email1After, 'email1 should not exist after replace=1');
		const email2After = getAttrArr.find(a => a.n === 'email2');
		assert.notExists(email2After, 'email2 should not exist after replace=1');
		const email3After = getAttrArr.find(a => a.n === 'email3');
		assert.notExists(email3After, 'email3 should not exist after replace=1');
		const jobTitleAfter = getAttrArr.find(a => a.n === 'jobTitle');
		assert.notExists(jobTitleAfter, 'jobTitle should not exist after replace=1');
		const workPhoneAfter = getAttrArr.find(a => a.n === 'workPhone');
		assert.notExists(workPhoneAfter, 'workPhone should not exist after replace=1');
		const homePhoneAfter = getAttrArr.find(a => a.n === 'homePhone');
		assert.notExists(homePhoneAfter, 'homePhone should not exist after replace=1');
		const mobilePhoneAfter = getAttrArr.find(a => a.n === 'mobilePhone');
		assert.notExists(mobilePhoneAfter, 'mobilePhone should not exist after replace=1');
		const pagerAfter = getAttrArr.find(a => a.n === 'pager');
		assert.notExists(pagerAfter, 'pager should not exist after replace=1');
		const workStreetAfter = getAttrArr.find(a => a.n === 'workStreet');
		assert.notExists(workStreetAfter, 'workStreet should not exist after replace=1');
		const workCityAfter = getAttrArr.find(a => a.n === 'workCity');
		assert.notExists(workCityAfter, 'workCity should not exist after replace=1');
		const workStateAfter = getAttrArr.find(a => a.n === 'workState');
		assert.notExists(workStateAfter, 'workState should not exist after replace=1');
		const workPostalCodeAfter = getAttrArr.find(a => a.n === 'workPostalCode');
		assert.notExists(workPostalCodeAfter, 'workPostalCode should not exist after replace=1');
		const workCountryAfter = getAttrArr.find(a => a.n === 'workCountry');
		assert.notExists(workCountryAfter, 'workCountry should not exist after replace=1');
		const workURLAfter = getAttrArr.find(a => a.n === 'workURL');
		assert.notExists(workURLAfter, 'workURL should not exist after replace=1');
		const notesAfter = getAttrArr.find(a => a.n === 'notes');
		assert.notExists(notesAfter, 'notes should not exist after replace=1');
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

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}">
					<a n="firstName"/>
					<a n="lastName"/>
					<a n="email"/>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(modRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(modRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Regression | Modify with replace=1 force=1 and empty fields returns fault', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const middleName = `Mid${common.getUniqueString()}`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="middleName">${middleName}</a>
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
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1" force="1">
				<cn id="${cn.id}">
					<a n="firstName"/>
					<a n="lastName"/>
					<a n="middleName"/>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(modRes.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(modRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');

		// Get the contact to verify original data persists
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${cn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrArr = Array.isArray(getCn.a) ? getCn.a : [getCn.a];
		const getAttr = (name) => {
			const found = getAttrArr.find(a => a.n === name);
			return found ? found._content : undefined;
		};
		assert.equal(getAttr('firstName'), firstName, 'firstName should still exist');
		assert.equal(getAttr('lastName'), lastName, 'lastName should still exist');
		assert.equal(getAttr('middleName'), middleName, 'middleName should still exist');
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

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;
		assert.exists(contactId, 'Contact ID should exist');

		// Modify the contact with fileAs=10
		const mod1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">10</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod1.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'fileAs=10 error code should be service.INVALID_REQUEST');

		// Modify the contact with fileAs=alpha
		const mod2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">abcd</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod2.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'fileAs=alpha error code should be service.INVALID_REQUEST');

		// Modify the contact with fileAs=-1
		const mod3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">-1</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod3.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'fileAs=-1 error code should be service.INVALID_REQUEST');

		// Modify the contact with fileAs=1.5
		const mod4 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">1.5</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod4.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'fileAs=1.5 error code should be service.INVALID_REQUEST');

		// Modify the contact
		const mod5 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs">0</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(mod5.Fault, 'fileAs=0 should not be a Fault');
		const mod5Cn = Array.isArray(mod5.ModifyContactResponse.cn)
			? mod5.ModifyContactResponse.cn[0] : mod5.ModifyContactResponse.cn;
		assert.exists(mod5Cn.id, 'ModifyContactResponse cn id should exist for fileAs=0');

		// Modify the contact with fileAs=blank
		const mod6 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}">
					<a n="fileAs"></a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(mod6.Fault, 'fileAs=blank should not be a Fault');
		const mod6Cn = Array.isArray(mod6.ModifyContactResponse.cn)
			? mod6.ModifyContactResponse.cn[0] : mod6.ModifyContactResponse.cn;
		assert.exists(mod6Cn.id, 'ModifyContactResponse cn id should exist for fileAs=blank');
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

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;
		assert.exists(contactId, 'Contact ID should exist');

		for (const fileAs of ['1', '2', '3', '4', '5', '6', '7']) {

			// Modify the contact
			const modRes = await soap.makeSOAPEnvelopeAccount(
				`<ModifyContactRequest xmlns="urn:zimbraMail">
					<cn id="${contactId}">
						<a n="fileAs">${fileAs}</a>
					</cn>
				</ModifyContactRequest>`, accountToken
			);

			// Verify response
			assert.notExists(modRes.Fault, `fileAs=${fileAs} should not be a Fault`);
			const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
				? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
			assert.exists(modCn.id, `ModifyContactResponse cn id should exist for fileAs=${fileAs}`);
		}
	});


	it('Regression | Modify a contact with invalid id', async () => {
		const mod1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="12345678">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod1.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod1.Fault.Detail.Error.Code, 'mail.NO_SUCH_CONTACT', 'Numeric id error code should be mail.NO_SUCH_CONTACT');

		// Modify the contact with alpha id
		const mod2 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="abcd">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod2.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Alpha id error code should be service.INVALID_REQUEST');

		// Modify the contact with negative id
		const mod3 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="-1">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod3.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod3.Fault.Detail.Error.Code, 'mail.NO_SUCH_CONTACT', 'Negative id error code should be mail.NO_SUCH_CONTACT');

		// Modify the contact with blank id
		const mod4 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="">
					<a n="fileAs">7</a>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.isString(mod4.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(mod4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', 'Blank id error code should be service.INVALID_REQUEST');
	});


	it('Sanity | Modify a contact with verbose=0', async () => {
		const firstName = `First${common.getUniqueString()}`;
		const lastName = `Last${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@hotmail.com`;
		const newEmail = `newemail${common.getUniqueString()}@gmail.com`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
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
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1" verbose="0">
				<cn id="${cn.id}">
					<a n="email">${newEmail}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact id should exist');
		const modAttrArr = modCn.a ? (Array.isArray(modCn.a) ? modCn.a : [modCn.a]) : [];
		const modFirstName = modAttrArr.find(a => a.n === 'firstName');
		assert.notExists(modFirstName, 'verbose=0 should not return firstName attr');
		const modLastName = modAttrArr.find(a => a.n === 'lastName');
		assert.notExists(modLastName, 'verbose=0 should not return lastName attr');
		const modEmail = modAttrArr.find(a => a.n === 'email');
		assert.notExists(modEmail, 'verbose=0 should not return email attr');

		// Get the contact to verify email was updated
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${modCn.id}"/>
			</GetContactsRequest>`, accountToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Get should not be a Fault');
		const getCnV = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrArrV = Array.isArray(getCnV.a) ? getCnV.a : [getCnV.a];
		const emailValV = getAttrArrV.find(a => a.n === 'email');
		assert.exists(emailValV, 'email attr should exist');
		assert.equal(emailValV._content, newEmail, 'Email should match new email');
	});


	it('Regression | Modify contact with force=1 to add duplicate email', async () => {
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create a contact
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
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="email">${email}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify with force should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');
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
		assert.exists(cn.id, 'Contact ID should exist');

		const nickname = `nick${common.getUniqueString()}`;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="nickname">${nickname}</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');
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
		assert.exists(cn.id, 'Contact ID should exist');

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${cn.id}">
					<a n="mobilePhone">0987654321</a>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		const modCn = Array.isArray(modRes.ModifyContactResponse.cn)
			? modRes.ModifyContactResponse.cn[0] : modRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'ModifyContactResponse cn id should exist');
	});
});
