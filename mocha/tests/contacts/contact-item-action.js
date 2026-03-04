import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Item Action', function () {
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
	it('Regression | Delete an Item (contact)', async () => {
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
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${cn.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(delRes.Fault, 'Delete should not be a Fault');
		const action = Array.isArray(delRes.ItemActionResponse.action)
			? delRes.ItemActionResponse.action[0] : delRes.ItemActionResponse.action;
		assert.equal(action.id, cn.id, 'Action id should match');
		assert.equal(action.op, 'delete', 'Op should be delete');
	});


	it('Regression | Delete a non-existing item (contact)', async () => {
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

		// Delete first
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${cn.id}"/>
			</ItemActionRequest>`, accountToken
		);

		// Delete again
		const del2Res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${cn.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(del2Res.Fault, 'Second delete should not be a Fault');
		assert.equal(del2Res.ItemActionResponse.action.op, 'delete', 'Verify op is delete');
	});


	it('Functional | Move an item (contact) to any folder', async () => {
		// Create folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'CreateFolder should not be a Fault');
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;

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

		// Move
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${cn.id}" l="${folder.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(moveRes.Fault, 'Move should not be a Fault');
		const action = Array.isArray(moveRes.ItemActionResponse.action)
			? moveRes.ItemActionResponse.action[0] : moveRes.ItemActionResponse.action;
		assert.equal(action.id, cn.id, 'Action id should match');
		assert.equal(action.op, 'move', 'Op should be move');
	});


	it('Regression | Move an item (contact) to a non-existing folder', async () => {
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

		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${cn.id}" l="-1"/>
			</ItemActionRequest>`, accountToken, false
		);
		assert.isString(moveRes.Fault.Detail.Error.Code, 'Move to non-existing folder should be a Fault');
	});


	it('Functional | Mark an item (contact) as read', async () => {
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

		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="read" id="${cn.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(readRes.Fault, 'Read should not be a Fault');
		const action = Array.isArray(readRes.ItemActionResponse.action)
			? readRes.ItemActionResponse.action[0] : readRes.ItemActionResponse.action;
		assert.equal(action.op, 'read', 'Op should be read');
	});


	it('Functional | Tag an item (contact)', async () => {
		// Create tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="4"/>
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

		// Tag
		const tagActionRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="tag" tag="${tag.id}" id="${cn.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(tagActionRes.Fault, 'Tag should not be a Fault');
		const action = Array.isArray(tagActionRes.ItemActionResponse.action)
			? tagActionRes.ItemActionResponse.action[0] : tagActionRes.ItemActionResponse.action;
		assert.equal(action.op, 'tag', 'Op should be tag');
	});


	it('Functional | Update an item (contact)', async () => {
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

		// Create tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag${common.getUniqueString()}" color="4"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		// Create folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, accountToken
		);
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;

		// Update
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="update" id="${cn.id}" tag="${tag.id}" l="${folder.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(updateRes.Fault, 'Update should not be a Fault');
		const action = Array.isArray(updateRes.ItemActionResponse.action)
			? updateRes.ItemActionResponse.action[0] : updateRes.ItemActionResponse.action;
		assert.equal(action.op, 'update', 'Op should be update');
	});


	it('Functional | Batch move contacts to folder', async () => {
		const ids = [];
		for (let i = 0; i < 2; i++) {
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

		const folderName = `batchmove${common.getUniqueString()}`;
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="7" view="contact"/>
			</CreateFolderRequest>`, accountToken
		);
		const folder = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0] : folderRes.CreateFolderResponse.folder;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ids.join(',')}" op="move" l="${folder.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Batch move should not be a Fault');
		const itemAction = Array.isArray(res.ItemActionResponse.action)
			? res.ItemActionResponse.action[0] : res.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');
	});


	it('Functional | Batch tag contacts', async () => {
		const tagName = `batchtag${common.getUniqueString()}`;
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, accountToken
		);
		const tag = Array.isArray(tagRes.CreateTagResponse.tag)
			? tagRes.CreateTagResponse.tag[0] : tagRes.CreateTagResponse.tag;

		const ids = [];
		for (let i = 0; i < 2; i++) {
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

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ids.join(',')}" op="tag" tag="${tag.id}"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Batch tag should not be a Fault');
		const itemAction = Array.isArray(res.ItemActionResponse.action)
			? res.ItemActionResponse.action[0] : res.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');
	});


	it('Functional | Batch flag contacts', async () => {
		const ids = [];
		for (let i = 0; i < 2; i++) {
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

		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ids.join(',')}" op="flag"/>
			</ItemActionRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'Batch flag should not be a Fault');
		const itemAction = Array.isArray(res.ItemActionResponse.action)
			? res.ItemActionResponse.action[0] : res.ItemActionResponse.action;
		assert.exists(itemAction, 'ItemActionResponse should contain action');
	});
});
