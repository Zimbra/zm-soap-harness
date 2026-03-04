import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Group Reference', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let account2Email, account2Token, account3Email, account3Token;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		account3Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);
		account3Token = await soap.getAccountAuthToken(account3Email);
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
	// XML: Contacts_Group_Reference_01 (smoke) — Create contact group reference with type G ie GAL entry
	// Note: Type G requires LDAP staftask, using inline member as substitute
	it('Smoke | Create contact group reference with type G ie GAL entry', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const mailId = `email${common.getUniqueString()}@domain.com`;

		// Auth as account1
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account1Token
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		// XML: t:select path="//acct:AuthResponse/acct:lifetime" match="^\d+$"
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/, 'lifetime should be numeric');
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// GetFolder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		// XML: t:select path="//mail:folder[@name='${globals.contacts}']" attr="id" set="folder.contacts"
		const root = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const findFolder = (node, name) => {
			if (node.name === name) return node;
			const children = node.folder ? (Array.isArray(node.folder) ? node.folder : [node.folder]) : [];
			for (const child of children) {
				const found = findFolder(child, name);
				if (found) return found;
			}
			return null;
		};
		const contactsFolder = findFolder(root, 'Contacts');
		assert.exists(contactsFolder, 'Contacts folder should exist');
		assert.exists(contactsFolder.id, 'Contacts folder id should exist');

		// Create contact group with inline member (substitute for GAL/G type)
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${mailId}">
					<a n="filesAs">${mailId}</a>
					<a n="nickname">${nickname}</a>
					<a n="type">group</a>
					<m type="I" value="${mailId}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		// XML: t:select attr="id" set="contact.id"
		assert.exists(cn.id, 'Contact group id should exist');
		// XML: t:select path='//mail:m[@type="G"]' attr="value" — verify member exists
		const members = Array.isArray(cn.m) ? cn.m : (cn.m ? [cn.m] : []);
		assert.isAbove(members.length, 0, 'Should have at least one member');
		assert.equal(members[0].value, mailId, 'Member value should match');
		// XML: t:select path="//mail:CreateContactResponse/mail:cn/mail:a[@n='nickname']" set="contact1.nickname"
		const attrs = Array.isArray(cn.a) ? cn.a : [cn.a];
		const nickAttr = attrs.find(a => a.n === 'nickname');
		assert.exists(nickAttr, 'nickname attr should exist');
	});


	// XML: AutoCompleteRequest_01 (smoke) — Search contact group
	it('Smoke | Search contact group', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Auth
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account1Token
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		// XML: t:select path="//acct:AuthResponse/acct:lifetime" match="^\d+$"
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/, 'lifetime should be numeric');
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Create a group contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<a n="nickname">${nickname}</a>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createRes.Fault, 'Create should not fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');

		// AutoComplete
		const autoRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${nickname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(autoRes.Fault, 'AutoComplete should not fault');
		// XML: t:select path="//mail:AutoCompleteResponse"
		const matches = autoRes.AutoCompleteResponse.match;
		const matchArr = Array.isArray(matches) ? matches : (matches ? [matches] : []);
		// XML: t:select path="//mail:match[@id='${contact.id}']"
		const contactMatch = matchArr.find(m => String(m.id) === String(cn.id));
		assert.exists(contactMatch, 'AutoComplete should find the contact group');
		// XML: t:select attr="display" match="${contact1.nickname}"
		assert.equal(contactMatch.display, nickname, 'match display should equal nickname');
		// XML: t:select attr="type" match="contact"
		assert.equal(contactMatch.type, 'contact', 'match type should be contact');
		// XML: t:select attr="isGroup" match="1"
		assert.equal(String(contactMatch.isGroup), '1', 'match isGroup should be 1');
	});


	// XML: Contacts_Group_Reference_02 (sanity) — Type I (inline member) + AutoComplete
	it('Sanity | Create contact group reference with type I ie inline member', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Auth
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account1Token
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		// XML: t:select path="//acct:AuthResponse/acct:lifetime" match="^\d+$"
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/, 'lifetime should be numeric');
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Create group with inline member
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${email}">
					<a n="filesAs">${email}</a>
					<a n="nickname">${nickname}</a>
					<a n="type">group</a>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		// XML: t:select attr="id" set="contact.id"
		assert.exists(cn.id, 'Contact id should exist');
		// XML: t:select path='//mail:m[@type="I"]' attr="value" match="${contact2.mailid}"
		const members = Array.isArray(cn.m) ? cn.m : (cn.m ? [cn.m] : []);
		const iMembers = members.filter(m => m.type === 'I');
		assert.isTrue(iMembers.some(m => m.value === email), 'I-type member value should match email');
		// XML: t:select path="//mail:CreateContactResponse/mail:cn/mail:a[@n='nickname']" set="contact2.nickname"
		const attrs = Array.isArray(cn.a) ? cn.a : [cn.a];
		const nickAttr = attrs.find(a => a.n === 'nickname');
		assert.exists(nickAttr, 'nickname attr should exist');

		// AutoComplete
		const autoRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${nickname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(autoRes.Fault, 'AutoComplete should not fault');
		// XML: t:select path="//mail:AutoCompleteResponse"
		const matches = autoRes.AutoCompleteResponse.match;
		const matchArr = Array.isArray(matches) ? matches : (matches ? [matches] : []);
		// XML: t:select path="//mail:match[@id='${contact.id}']"
		const contactMatch = matchArr.find(m => String(m.id) === String(cn.id));
		assert.exists(contactMatch, 'AutoComplete should find the contact group');
		// XML: t:select attr="display" match="${contact2.nickname}"
		assert.equal(contactMatch.display, nickname, 'match display should equal nickname');
		// XML: t:select attr="type" match="contact"
		assert.equal(contactMatch.type, 'contact', 'match type should be contact');
		// XML: t:select attr="isGroup" match="1"
		assert.equal(String(contactMatch.isGroup), '1', 'match isGroup should be 1');
	});


	// XML: Contacts_Group_Reference_03 (sanity) — Type C (contact reference) + AutoComplete
	it('Sanity | Create contact group reference with type C ie reference to other contact', async () => {
		const nickname = `contact${common.getUniqueString()}`;

		// Auth as account2
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account2Token
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		// XML: t:select path="//acct:AuthResponse/acct:lifetime" match="^\d+$"
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/, 'lifetime should be numeric');
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Create a reference contact
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(refRes.Fault, 'Create ref contact should not fault');
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;
		// XML: t:select attr="id" set="contact_ref.id"
		assert.exists(refCn.id, 'Ref contact ID should exist');

		// Create group with C-type member
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="email${common.getUniqueString()}@domain.com">
					<a n="filesAs">email${common.getUniqueString()}@domain.com</a>
					<a n="nickname">${nickname}</a>
					<a n="type">group</a>
					<m type="C" value="${refCn.id}"/>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(res.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		// XML: t:select attr="id" set="contact.id"
		assert.exists(cn.id, 'Contact group id should exist');
		// XML: t:select path='//mail:m[@type="C"]' attr="value" match="${contact_ref.id}"
		const members = Array.isArray(cn.m) ? cn.m : (cn.m ? [cn.m] : []);
		const cMembers = members.filter(m => m.type === 'C');
		assert.isTrue(cMembers.some(m => String(m.value) === String(refCn.id)), 'C-type member value should match refCn.id');
		// XML: t:select path="//mail:CreateContactResponse/mail:cn/mail:a[@n='nickname']" set="contact3.nickname"
		const attrs = Array.isArray(cn.a) ? cn.a : [cn.a];
		const nickAttr = attrs.find(a => a.n === 'nickname');
		assert.exists(nickAttr, 'nickname attr should exist');

		// AutoComplete
		const autoRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${nickname}</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(autoRes.Fault, 'AutoComplete should not fault');
		// XML: t:select path="//mail:AutoCompleteResponse"
		const matches = autoRes.AutoCompleteResponse.match;
		const matchArr = Array.isArray(matches) ? matches : (matches ? [matches] : []);
		// XML: t:select path="//mail:match[@id='${contact.id}']"
		const contactMatch = matchArr.find(m => String(m.id) === String(cn.id));
		assert.exists(contactMatch, 'AutoComplete should find the contact group');
		// XML: t:select attr="display" match="${contact3.nickname}"
		assert.equal(contactMatch.display, nickname, 'match display should equal nickname');
		// XML: t:select attr="type" match="contact"
		assert.equal(contactMatch.type, 'contact', 'match type should be contact');
		// XML: t:select attr="isGroup" match="1"
		assert.equal(String(contactMatch.isGroup), '1', 'match isGroup should be 1');
	});


	// XML: Contacts_Group_Reference_04 (sanity) — Mixed types C,I + AutoComplete
	it('Sanity | Create contact group reference with type C,G,I', async () => {
		const nickname = `contact${common.getUniqueString()}`;
		const email = `email${common.getUniqueString()}@domain.com`;

		// Auth as account3
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account3Email}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, account3Token
		);
		assert.notExists(authRes.Fault, 'Auth should not fault');
		// XML: t:select path="//acct:AuthResponse/acct:lifetime" match="^\d+$"
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/, 'lifetime should be numeric');
		// XML: t:select path="//acct:AuthResponse/acct:authToken" set="authToken"
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		// Create a reference contact
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account3Token
		);
		assert.notExists(refRes.Fault, 'Create ref contact should not fault');
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;
		// XML: t:select attr="id" set="contact_ref.id"
		assert.exists(refCn.id, 'Ref contact ID should exist');

		// Create group with mixed types
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${email}">
					<a n="filesAs">${email}</a>
					<a n="nickname">${nickname}</a>
					<a n="type">group</a>
					<m type="C" value="${refCn.id}"/>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, account3Token
		);
		assert.notExists(res.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(res.CreateContactResponse.cn)
			? res.CreateContactResponse.cn[0] : res.CreateContactResponse.cn;
		// XML: t:select attr="id" set="contact.id"
		assert.exists(cn.id, 'Contact group id should exist');
		const members = Array.isArray(cn.m) ? cn.m : (cn.m ? [cn.m] : []);
		// XML: t:select path='//mail:m[@type="C"]' attr="value" match="${contact_ref.id}"
		const cMembers = members.filter(m => m.type === 'C');
		assert.isTrue(cMembers.some(m => String(m.value) === String(refCn.id)), 'C-type member value should match refCn.id');
		// XML: t:select path='//mail:m[@type="I"]' attr="value" match="${contact2.mailid}"
		const iMembers = members.filter(m => m.type === 'I');
		assert.isTrue(iMembers.some(m => m.value === email), 'I-type member value should match email');
		// XML: t:select path="//mail:CreateContactResponse/mail:cn/mail:a[@n='nickname']" set="contact4.nickname"
		const attrs = Array.isArray(cn.a) ? cn.a : [cn.a];
		const nickAttr = attrs.find(a => a.n === 'nickname');
		assert.exists(nickAttr, 'nickname attr should exist');

		// AutoComplete
		const autoRes = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${nickname}</name>
			</AutoCompleteRequest>`, account3Token
		);
		assert.notExists(autoRes.Fault, 'AutoComplete should not fault');
		// XML: t:select path="//mail:AutoCompleteResponse"
		const matches = autoRes.AutoCompleteResponse.match;
		const matchArr = Array.isArray(matches) ? matches : (matches ? [matches] : []);
		// XML: t:select path="//mail:match[@id='${contact.id}']"
		const contactMatch = matchArr.find(m => String(m.id) === String(cn.id));
		assert.exists(contactMatch, 'AutoComplete should find the contact group');
		// XML: t:select attr="display" match="${contact4.nickname}"
		assert.equal(contactMatch.display, nickname, 'match display should equal nickname');
		// XML: t:select attr="type" match="contact"
		assert.equal(contactMatch.type, 'contact', 'match type should be contact');
		// XML: t:select attr="isGroup" match="1"
		assert.equal(String(contactMatch.isGroup), '1', 'match isGroup should be 1');
	});
});
