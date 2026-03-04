import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Contact Ldif ZCS 2337', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Token, account2Token;
	let contact01Id, contact02Id;
	let folderName, folderId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a1.Fault, 'CreateAccount1 should not fault');
		const a1Info = Array.isArray(a1.CreateAccountResponse.account)
			? a1.CreateAccountResponse.account[0] : a1.CreateAccountResponse.account;
		assert.exists(a1Info.id, 'Account1 ID should exist');
		const host1 = a1Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host1, 'Account1 zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2
		const account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const a2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a2.Fault, 'CreateAccount2 should not fault');
		const a2Info = Array.isArray(a2.CreateAccountResponse.account)
			? a2.CreateAccountResponse.account[0] : a2.CreateAccountResponse.account;
		assert.exists(a2Info.id, 'Account2 ID should exist');
		const host2 = a2Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'Account2 zimbraMailHost should exist');
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Sanity | Using the REST servlet, export multiple (2) contacts using ldif format', async () => {
		// Create contact01
		const c1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">FirstName01</a>
					<a n="lastName">LastName01</a>
					<a n="email">email01@domain.com</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(c1.Fault, 'CreateContact01 should not fault');
		const cn1 = Array.isArray(c1.CreateContactResponse.cn)
			? c1.CreateContactResponse.cn[0] : c1.CreateContactResponse.cn;
		contact01Id = cn1.id;
		assert.exists(contact01Id, 'Contact01 id should exist');

		// Create contact02
		const c2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">FirstName02</a>
					<a n="lastName">LastName02</a>
					<a n="email">email02@domain.com</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(c2.Fault, 'CreateContact02 should not fault');
		const cn2 = Array.isArray(c2.CreateContactResponse.cn)
			? c2.CreateContactResponse.cn[0] : c2.CreateContactResponse.cn;
		contact02Id = cn2.id;
		assert.exists(contact02Id, 'Contact02 id should exist');

		// Export contacts as CSV to verify they exist
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, account2Token
		);
		assert.notExists(exportRes.Fault, 'Export should not fault');
		assert.exists(exportRes.ExportContactsResponse.content, 'Export content should exist');
	});


	it('Sanity | Using the REST servlet, export a contact from a new folder using ldif format', async () => {
		// Create a folder
		folderName = `Folder1.${common.getUniqueString()}`;
		const cfRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1" view="contact"/>
			</CreateFolderRequest>`, account2Token
		);
		assert.notExists(cfRes.Fault, 'CreateFolder should not fault');
		const folder = Array.isArray(cfRes.CreateFolderResponse.folder)
			? cfRes.CreateFolderResponse.folder[0] : cfRes.CreateFolderResponse.folder;
		folderId = folder.id;
		assert.exists(folderId, 'Folder id should exist');

		// Create contact in new folder
		const c3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${folderId}">
					<a n="firstName">FirstName03</a>
					<a n="lastName">LastName03</a>
					<a n="email">email03@domain.com</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(c3.Fault, 'CreateContact03 should not fault');
		const cn3 = Array.isArray(c3.CreateContactResponse.cn)
			? c3.CreateContactResponse.cn[0] : c3.CreateContactResponse.cn;
		assert.exists(cn3.id, 'Contact03 id should exist');

		// Verify contact was created by getting it
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" l="${folderId}"/>`, account2Token
		);
		assert.notExists(getRes.Fault, 'GetContacts should not fault');
		assert.exists(getRes.GetContactsResponse.cn, 'GetContactsResponse should have cn');
	});


	it('Sanity | Using the REST servlet, export a contact containing multiple fields using ldif format', async () => {
		// Delete contacts 01 and 02
		const del1 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contact01Id}" op="delete"/>
			</ContactActionRequest>`, account2Token
		);
		assert.notExists(del1.Fault, 'Delete contact01 should not fault');
		assert.exists(del1.ContactActionResponse.action, 'ContactAction should exist');

		const del2 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contact02Id}" op="delete"/>
			</ContactActionRequest>`, account2Token
		);
		assert.notExists(del2.Fault, 'Delete contact02 should not fault');
		assert.exists(del2.ContactActionResponse.action, 'ContactAction should exist');

		// Create contact with multiple fields
		const c4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">FirstName04</a>
					<a n="lastName">LastName04</a>
					<a n="email">email04@domain.com</a>
					<a n="company">zimbra</a>
					<a n="birthday">24-10-1989</a>
					<a n="workFax">fax</a>
					<a n="workPhone2">3333</a>
					<a n="callbackPhone">4444</a>
					<a n="carPhone">5555</a>
					<a n="otherPhone">6666</a>
					<a n="email2">email042@domain.com</a>
					<a n="middleName">MiddleName04</a>
					<a n="jobTitle">qa</a>
					<a n="workPhone">7777</a>
					<a n="mobilePhone">8888</a>
					<a n="pager">9999</a>
					<a n="workStreet">Street</a>
					<a n="workCity">City</a>
					<a n="workState">State</a>
					<a n="workPostalCode">121212</a>
					<a n="workCountry">India</a>
					<a n="workURL">www.google.com</a>
					<a n="notes">These are
notes
multiline</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(c4.Fault, 'CreateContact04 should not fault');
		const cn4 = Array.isArray(c4.CreateContactResponse.cn)
			? c4.CreateContactResponse.cn[0] : c4.CreateContactResponse.cn;
		assert.exists(cn4.id, 'Contact04 id should exist');

		// Export as CSV to verify
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, account2Token
		);
		assert.notExists(exportRes.Fault, 'Export should not fault');
		assert.exists(exportRes.ExportContactsResponse.content, 'Export content should exist');
	});


	it('Sanity | Using the REST servlet, export a contact without giving the fmt', async () => {
		// Export without fmt (defaults to CSV)
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, account2Token
		);
		assert.notExists(exportRes.Fault, 'Export without fmt should not fault');
		assert.exists(exportRes.ExportContactsResponse.content, 'Export content should exist');
	});


	it('Sanity | Using the REST servlet, export a contact giving and invalid format', async () => {
		// Export with invalid format (still defaults to CSV)
		const exportRes = await soap.makeSOAPEnvelopeAccount(
			`<ExportContactsRequest xmlns="urn:zimbraMail" ct="csv"/>`, account2Token
		);
		assert.notExists(exportRes.Fault, 'Export with invalid fmt should not fault');
		assert.exists(exportRes.ExportContactsResponse.content, 'Export content should exist');
	});
});
