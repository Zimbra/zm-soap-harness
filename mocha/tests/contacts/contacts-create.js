import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Contacts > Contacts Create', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token, account2Email, account2Token;

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
		account2Token = await soap.getAccountAuthToken(account2Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create a contact', async () => {
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
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Functional | Create a contact that is already existing', async () => {
		const firstName = `Contact${common.getUniqueString()}`;
		const lastName = `Name${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create first contact
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res1.Fault, 'First create should not be a Fault');

		// Create duplicate contact
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res2.Fault, 'Duplicate create should not be a Fault');
		const cn2 = Array.isArray(res2.CreateContactResponse.cn)
			? res2.CreateContactResponse.cn[0] : res2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Duplicate contact id should exist');
	});


	it('Functional | Create a Contact with all the fields', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="company">pspl</a>
					<a n="workFax">6666</a>
					<a n="workPhone2">6666</a>
					<a n="callbackPhone">6666</a>
					<a n="carPhone">6666</a>
					<a n="homePhone2">6666</a>
					<a n="homeFax">6666</a>
					<a n="otherPhone">6666</a>
					<a n="otherFax">6666</a>
					<a n="email2">user1@persistent.co.in</a>
					<a n="middleName">s</a>
					<a n="jobTitle">QA</a>
					<a n="workPhone">66666</a>
					<a n="homePhone">66666</a>
					<a n="mobilePhone">6666</a>
					<a n="pager">666</a>
					<a n="email3">user1@persistent.co.in</a>
					<a n="workStreet">ttt</a>
					<a n="workCity">tt</a>
					<a n="workState">tt</a>
					<a n="workPostalCode">tt</a>
					<a n="workCountry">tt</a>
					<a n="workURL">tt</a>
					<a n="notes">hihohioohhghghgjhjhj</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Regression | Create a Contact with Blank Fields', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName"></a>
					<a n="lastName"></a>
					<a n="email"></a>
					<a n="fileAs"></a>
				</cn>
			</CreateContactRequest>`, account1Token, false
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		const code = res.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Functional | Create a Contact with leading spaces in First Name and Last name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">	Leading</a>
					<a n="lastName">	 Spaces</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse.cn, 'Contact should be created');
	});


	it('Functional | Create a Contact with trailing spaces in First Name and Last name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Trailing			   </a>
					<a n="lastName">Spaces				</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse.cn, 'Contact should be created');
	});


	it('Functional | Create a Contact with Duplicate e-mail id', async () => {
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create first contact with email
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Contact${common.getUniqueString()}</a>
					<a n="lastName">Name${common.getUniqueString()}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res1.Fault, 'First create should not be a Fault');

		// Create second contact with same email
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Contact${common.getUniqueString()}</a>
					<a n="lastName">Name${common.getUniqueString()}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res2.Fault, 'Duplicate email create should not be a Fault');
		const cn2 = Array.isArray(res2.CreateContactResponse.cn)
			? res2.CreateContactResponse.cn[0] : res2.CreateContactResponse.cn;
		assert.exists(cn2.id, 'Contact id should exist');
	});


	it('Functional | Create a contact with a valid company name and file as option company', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="company">pspl</a>
					<a n="fileAs">3</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Functional | Create a contact without a company name and with file as option company', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="fileAs">3</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Regression | Create a Contact with invalid File As option (10)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="company">persistent</a>
					<a n="fileAs">10</a>
				</cn>
			</CreateContactRequest>`, account1Token, false
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		const code = res.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Regression | Create a Contact with negative File As option', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
					<a n="company">persistent</a>
					<a n="fileAs">-1</a>
				</cn>
			</CreateContactRequest>`, account1Token, false
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		const code = res.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Functional | Delete already deleted Contact', async () => {
		// Create contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		// Delete it first time
		const del1 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ContactActionRequest>`, account1Token
		);
		assert.notExists(del1.Fault, 'First delete should not be a Fault');
		assert.exists(del1.ContactActionResponse, 'ContactActionResponse should exist');
		assert.exists(del1.ContactActionResponse.action, 'Action should exist');

		// Delete it second time
		const del2 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ContactActionRequest>`, account1Token
		);
		assert.notExists(del2.Fault, 'Second delete should not be a Fault');
		assert.exists(del2.ContactActionResponse, 'ContactActionResponse should exist');
		assert.exists(del2.ContactActionResponse.action, 'Action should exist');
	});


	it('Regression | Create a Contact with different valid file as options', async () => {
		for (const fileAs of ['1', '2', '3', '4', '5', '6', '7']) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">First${common.getUniqueString()}</a>
						<a n="lastName">Last${common.getUniqueString()}</a>
						<a n="email">email${common.getUniqueString()}@domain.com</a>
						<a n="company">Company</a>
						<a n="fileAs">${fileAs}</a>
					</cn>
				</CreateContactRequest>`, account1Token
			);
			assert.notExists(res.Fault, `fileAs=${fileAs} should not be a Fault`);
			assert.exists(res.CreateContactResponse.cn, `Contact with fileAs=${fileAs} should be created`);
		}
	});


	it('Regression | Create a Contact with a bad attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="">First${common.getUniqueString()}</a>
				</cn>
			</CreateContactRequest>`, account1Token, false
		);

		assert.exists(res.Fault, 'Response should be a Fault');
		const code = res.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});


	it('Sanity | Create a contact using a simple inline vCard', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
<vcard>
BEGIN:VCARD
VERSION:2.1
N:Smith;John;M.;Mr.;Esq.
TEL;WORK;VOICE;MSG:+1 (919) 555-1234
TEL;WORK;FAX:+1 (919) 555-9876
ADR;WORK;PARCEL;POSTAL;DOM:Suite 101;1 Central St.;Any Town;NC;27654
END:VCARD
</vcard>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		const attrs = cn._attrs || {};
		const getAttr = (name) => {
			if (attrs[name]) return attrs[name];
			if (cn.a) {
				const arr = Array.isArray(cn.a) ? cn.a : [cn.a];
				const found = arr.find(a => a.n === name);
				return found ? found._content : undefined;
			}
			return undefined;
		};
		assert.equal(getAttr('firstName'), 'John', 'firstName should be John');
		assert.equal(getAttr('lastName'), 'Smith', 'lastName should be Smith');
		assert.equal(getAttr('middleName'), 'M.', 'middleName should be M.');
		assert.equal(getAttr('nameSuffix'), 'Esq.', 'nameSuffix should be Esq.');
		assert.equal(getAttr('namePrefix'), 'Mr.', 'namePrefix should be Mr.');
	});


	it('Sanity | Create a contact using inline vCard exported from Outlook', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
<vcard>
BEGIN:VCARD
VERSION:2.1
N:_LAST_;_FIRST_;_MIDDLE_;_TITLE_;_SUFFIX_
FN:_FIRST_ _MIDDLE_ _LAST_ _SUFFIX_
NICKNAME:_NICKNAME_
ORG:_COMPANY_;_DEPARTMENT_
TITLE:_JOB_TITLE_
NOTE;ENCODING=QUOTED-PRINTABLE:_NOTES_=0D=0A
TEL;WORK;VOICE:_BUSINESS_PHONE_
TEL;HOME;VOICE:_HOME_PHONE_
TEL;CELL;VOICE:_MOBILE_PHONE_
TEL;CAR;VOICE:_CAR_PHONE_
TEL;PAGER;VOICE:_PAGER_NUMBER_
TEL;WORK;FAX:_BUSINESS_FAX_
TEL;HOME;FAX:_HOME_FAX_
EMAIL;PREF;INTERNET:_EMAILONE_@DOMAIN.COM_
REV:20060321T084730Z
END:VCARD
</vcard>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		const attrs = cn._attrs || {};
		const getAttr = (name) => {
			if (attrs[name]) return attrs[name];
			if (cn.a) {
				const arr = Array.isArray(cn.a) ? cn.a : [cn.a];
				const found = arr.find(a => a.n === name);
				return found ? found._content : undefined;
			}
			return undefined;
		};
		assert.equal(getAttr('email'), '_EMAILONE_@DOMAIN.COM_', 'Email should match');
	});


	it('Sanity | Create a contact with verbose=0 and verify that only id is returned', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail" verbose="0">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.CreateContactResponse, 'CreateContactResponse should exist');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});
});
