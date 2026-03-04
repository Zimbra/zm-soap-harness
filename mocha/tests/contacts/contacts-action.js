import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contacts Action', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let folderInbox, folderTrash, folderSent, folderSpam, folderDrafts;

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

		// Get folder IDs
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		const folders = folderRes.GetFolderResponse.folder;
		const root = Array.isArray(folders) ? folders[0] : folders;
		const findFolder = (name) => {
			const search = (node) => {
				if (node.name === name) return node.id;
				if (node.folder) {
					const arr = Array.isArray(node.folder) ? node.folder : [node.folder];
					for (const f of arr) {
						const found = search(f);
						if (found) return found;
					}
				}
				return null;
			};
			return search(root);
		};
		folderInbox = findFolder('Inbox') || '2';
		folderTrash = findFolder('Trash') || '3';
		folderSent = findFolder('Sent') || '5';
		folderSpam = findFolder('Junk') || '4';
		folderDrafts = findFolder('Drafts') || '6';
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
	it('Smoke | Create a contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		assert.exists(cn.id, 'Contact id should exist');
		assert.isAbove(Number(cn.id), 0, 'Contact id should be > 0');
	});


	it('Regression | Delete already deleted Contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
		const contactId = cn.id;

		// Delete first time
		const del1 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(del1.Fault, 'First delete should not be a Fault');
		assert.equal(del1.ContactActionResponse.action.op, 'delete', 'Verify op is delete');
		assert.equal(del1.ContactActionResponse.action.id, contactId, 'Verify action id');

		// Delete second time
		const del2 = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(del2.Fault, 'Second delete should not be a Fault');
		assert.equal(del2.ContactActionResponse.action.op, 'delete', 'Verify op is delete');
		assert.equal(del2.ContactActionResponse.action.id, contactId, 'Verify action id');
	});


	it('Smoke | Delete a valid contact', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(delRes.Fault, 'Delete should not be a Fault');
		assert.equal(delRes.ContactActionResponse.action.op, 'delete', 'Verify op is delete');
		assert.equal(delRes.ContactActionResponse.action.id, cn.id, 'Verify action id');
	});


	it('Regression | Delete an invalid contact', async () => {
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="1234" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(delRes.Fault, 'Delete invalid should not be a Fault');
		assert.equal(delRes.ContactActionResponse.action.op, 'delete', 'Verify op is delete');
	});


	it('Sanity | Move a contact to Inbox', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="move" l="${folderInbox}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(moveRes.Fault, 'Move should not be a Fault');
		const action = Array.isArray(moveRes.ContactActionResponse.action)
			? moveRes.ContactActionResponse.action[0] : moveRes.ContactActionResponse.action;
		assert.equal(action.id, cn.id, 'Action id should match');
	});


	it('Sanity | Move a contact to Sent folder', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="move" l="${folderSent}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(moveRes.Fault, 'Move should not be a Fault');
		const action = Array.isArray(moveRes.ContactActionResponse.action)
			? moveRes.ContactActionResponse.action[0] : moveRes.ContactActionResponse.action;
		assert.equal(action.id, cn.id, 'Action id should match');
	});


	it('Sanity | Move a contact to trash folder', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="move" l="${folderTrash}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(moveRes.Fault, 'Move should not be a Fault');
		const action = Array.isArray(moveRes.ContactActionResponse.action)
			? moveRes.ContactActionResponse.action[0] : moveRes.ContactActionResponse.action;
		assert.equal(action.id, cn.id, 'Action id should match');
	});


	it('Sanity | Delete the contact from trash folder', async () => {
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Move to trash first
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="move" l="${folderTrash}"/>
			</ContactActionRequest>`, accountToken
		);

		// Delete from trash
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(delRes.Fault, 'Delete should not be a Fault');
		const action = Array.isArray(delRes.ContactActionResponse.action)
			? delRes.ContactActionResponse.action[0] : delRes.ContactActionResponse.action;
		assert.equal(action.id, cn.id, 'Action id should match');
	});


	it('Sanity | Tag a contact', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountToken
		);
		assert.notExists(tagRes.Fault, 'CreateTag should not be a Fault');
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;
		const tagId = tag.id;
		assert.equal(String(tag.color), '4', 'Tag color should be 4');

		// Create contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRes.Fault, 'Create should not be a Fault');
		const cn = Array.isArray(createRes.CreateContactResponse.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;

		// Tag the contact
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tagId}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Tag should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, 'tag', 'Operation should be tag');
	});


	it('Sanity | Un-tag a contact', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Create and tag contact
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

		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);

		// Un-tag the contact
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="!tag" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Untag should not be a Fault');
		const action = Array.isArray(actionRes.ContactActionResponse.action)
			? actionRes.ContactActionResponse.action[0] : actionRes.ContactActionResponse.action;
		assert.equal(action.op, '!tag', 'Operation should be !tag');
	});


	it('Sanity | Flag a contact', async () => {
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

		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="flag"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Flag should not be a Fault');
		assert.equal(actionRes.ContactActionResponse.action.op, 'flag', 'Verify op is flag');
		assert.equal(actionRes.ContactActionResponse.action.id, cn.id, 'Verify action id');
	});


	it('Sanity | Un-flag a contact', async () => {
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

		// Flag first
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="flag"/>
			</ContactActionRequest>`, accountToken
		);

		// Un-flag
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="!flag"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Unflag should not be a Fault');
		assert.equal(actionRes.ContactActionResponse.action.op, '!flag', 'Verify op is !flag');
		assert.equal(actionRes.ContactActionResponse.action.id, cn.id, 'Verify action id');
	});


	it('Functional | ContactActionRequest with op update', async () => {
		const tagName = `Tag${common.getUniqueString()}`;

		// Create tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Create contact
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

		// Update with tag
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="update" tag="${tag.id}"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Update should not be a Fault');
		assert.equal(actionRes.ContactActionResponse.action.op, 'update', 'Verify op is update');
		assert.equal(actionRes.ContactActionResponse.action.id, cn.id, 'Verify action id');
	});


	it('Regression | Un-Flag a Contact which is not flagged', async () => {
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

		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${cn.id}" op="!flag"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(actionRes.Fault, 'Unflag unflagged should not be a Fault');
		assert.equal(actionRes.ContactActionResponse.action.op, '!flag', 'Verify op is !flag');
		assert.equal(actionRes.ContactActionResponse.action.id, cn.id, 'Verify action id');
	});


	it('Functional | Delete more than one (3) contacts at a time', async () => {
		const ids = [];
		for (let i = 0; i < 3; i++) {
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
			ids.push(cn.id);
		}

		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${ids.join(',')}" op="delete"/>
			</ContactActionRequest>`, accountToken
		);
		assert.notExists(delRes.Fault, 'Batch delete should not be a Fault');
		assert.equal(delRes.ContactActionResponse.action.op, 'delete', 'Verify op is delete');
		assert.include(delRes.ContactActionResponse.action.id, ids[0], 'Verify action contains first id');
	});
});
