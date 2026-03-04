import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 75912', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
	it('Sanity | ModifyContactRequest(ReplaceMode 0) needs way to remove all m nodes 1', async () => {

		// Create a contact reference
		const contactEmail = `email${common.getUniqueString()}@domain.com`;
		const createRefRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First.${common.getUniqueString()}</a>
					<a n="lastName">Last.${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRefRes.Fault, 'CreateContact ref should not fault');
		const refCn = Array.isArray(createRefRes.CreateContactResponse.cn)
			? createRefRes.CreateContactResponse.cn[0] : createRefRes.CreateContactResponse.cn;
		const contactRefId = refCn.id;
		assert.exists(contactRefId, 'Contact ref id should exist');

		// Create contact group with members
		const inlineEmail = `email${common.getUniqueString()}@domain.com`;
		const groupEmail = `group${common.getUniqueString()}@domain.com`;
		const createGroupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn fileAsStr="${groupEmail}">
					<a n="filesAs">${groupEmail}</a>
					<a n="type">group</a>
					<m type="C" value="${contactRefId}"/>
					<m type="I" value="${inlineEmail}"/>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createGroupRes.Fault, 'CreateContactGroup should not fault');
		const groupCn = Array.isArray(createGroupRes.CreateContactResponse.cn)
			? createGroupRes.CreateContactResponse.cn[0] : createGroupRes.CreateContactResponse.cn;
		const groupId = groupCn.id;
		assert.exists(groupId, 'Group id should exist');
		// Verify members exist in create response
		const members = Array.isArray(groupCn.m) ? groupCn.m : (groupCn.m ? [groupCn.m] : []);
		const cMember = members.find(m => m.type === 'C');
		assert.exists(cMember, 'C member should exist');
		assert.equal(cMember.value, contactRefId, 'C member value should match contact ref id');
		const iMember = members.find(m => m.type === 'I');
		assert.exists(iMember, 'I member should exist');
		assert.equal(iMember.value, inlineEmail, 'I member value should match inline email');

		// Modify group with replace=0 and m op=reset to drop all members
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${groupId}">
					<a n="type">group</a>
					<m op="reset"/>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyContact reset should not fault');
		const modCn = Array.isArray(modifyRes.ModifyContactResponse.cn)
			? modifyRes.ModifyContactResponse.cn[0] : modifyRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact group id should exist');
		// Verify members are dropped (emptyset)
		const modMembers = Array.isArray(modCn.m) ? modCn.m : (modCn.m ? [modCn.m] : []);
		const modCMember = modMembers.find(m => m.type === 'C' && m.value === contactRefId);
		assert.isTrue(!modCMember, 'C member should be dropped after reset (emptyset)');
		const modIMember = modMembers.find(m => m.type === 'I' && m.value === inlineEmail);
		assert.isTrue(!modIMember, 'I member should be dropped after reset (emptyset)');
	});


	it('Sanity | ModifyContactRequest(ReplaceMode 0) needs way to remove all m nodes 2', async () => {

		// Create a contact reference
		const contactEmail = `email1${common.getUniqueString()}@domain.com`;
		const createRefRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First1.${common.getUniqueString()}</a>
					<a n="lastName">Last1.${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRefRes.Fault, 'CreateContact ref should not fault');
		const refCn = Array.isArray(createRefRes.CreateContactResponse.cn)
			? createRefRes.CreateContactResponse.cn[0] : createRefRes.CreateContactResponse.cn;
		const contactRefId = refCn.id;
		assert.exists(contactRefId, 'Contact ref id should exist');

		// Create contact group with members
		const inlineEmail = `email${common.getUniqueString()}@domain.com`;
		const groupEmail = `group1${common.getUniqueString()}@domain.com`;
		const createGroupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${groupEmail}">
					<a n="filesAs">${groupEmail}</a>
					<a n="type">group</a>
					<m type="C" value="${contactRefId}"/>
					<m type="I" value="${inlineEmail}"/>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createGroupRes.Fault, 'CreateContactGroup should not fault');
		const groupCn = Array.isArray(createGroupRes.CreateContactResponse.cn)
			? createGroupRes.CreateContactResponse.cn[0] : createGroupRes.CreateContactResponse.cn;
		const groupId = groupCn.id;
		assert.exists(groupId, 'Group id should exist');
		const members = Array.isArray(groupCn.m) ? groupCn.m : (groupCn.m ? [groupCn.m] : []);
		const cMember = members.find(m => m.type === 'C');
		assert.exists(cMember, 'C member should exist');
		assert.equal(cMember.value, contactRefId, 'C member value should match');
		const iMember = members.find(m => m.type === 'I');
		assert.exists(iMember, 'I member should exist');
		assert.equal(iMember.value, inlineEmail, 'I member value should match');

		// Modify group: reset all members
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${groupId}">
					<a n="type">group</a>
					<m op="reset"/>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyContact reset should not fault');
		const modCn = Array.isArray(modifyRes.ModifyContactResponse.cn)
			? modifyRes.ModifyContactResponse.cn[0] : modifyRes.ModifyContactResponse.cn;
		assert.exists(modCn.id, 'Modified contact group id should exist');
		let modMembers = Array.isArray(modCn.m) ? modCn.m : (modCn.m ? [modCn.m] : []);
		assert.isTrue(!modMembers.find(m => m.type === 'C' && m.value === contactRefId),
			'C member should be dropped after reset (emptyset)');
		assert.isTrue(!modMembers.find(m => m.type === 'I' && m.value === inlineEmail),
			'I member should be dropped after reset (emptyset)');

		// Re-add members using op="+"
		const newInlineEmail = `email3${common.getUniqueString()}@domain.com`;
		const readdRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0">
				<cn id="${groupId}">
					<a n="filesAs">${groupEmail}</a>
					<a n="type">group</a>
					<m op="+" type="C" value="${contactRefId}"/>
					<m op="+" type="I" value="${newInlineEmail}"/>
				</cn>
			</ModifyContactRequest>`, accountToken
		);
		assert.notExists(readdRes.Fault, 'ModifyContact re-add should not fault');
		const readdCn = Array.isArray(readdRes.ModifyContactResponse.cn)
			? readdRes.ModifyContactResponse.cn[0] : readdRes.ModifyContactResponse.cn;
		assert.exists(readdCn.id, 'Re-added group id should exist');
		modMembers = Array.isArray(readdCn.m) ? readdCn.m : (readdCn.m ? [readdCn.m] : []);
		assert.exists(modMembers.find(m => m.type === 'C' && m.value === contactRefId),
			'C member should be re-added');
		assert.exists(modMembers.find(m => m.type === 'I' && m.value === newInlineEmail),
			'I member should be re-added');
	});


	it('Sanity | Send ModifyContactRequest(ReplaceMode 1) and m op reset', async () => {

		// Create a contact reference
		const contactEmail = `email2${common.getUniqueString()}@domain.com`;
		const createRefRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First2.${common.getUniqueString()}</a>
					<a n="lastName">Last2.${common.getUniqueString()}</a>
					<a n="email">${contactEmail}</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createRefRes.Fault, 'CreateContact ref should not fault');
		const refCn = Array.isArray(createRefRes.CreateContactResponse.cn)
			? createRefRes.CreateContactResponse.cn[0] : createRefRes.CreateContactResponse.cn;
		const contactRefId = refCn.id;
		assert.exists(contactRefId, 'Contact ref id should exist');

		// Create contact group
		const inlineEmail = `email3${common.getUniqueString()}@domain.com`;
		const groupEmail = `group3${common.getUniqueString()}@domain.com`;
		const createGroupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn fileAsStr="${groupEmail}">
					<a n="filesAs">${groupEmail}</a>
					<a n="type">group</a>
					<m type="C" value="${contactRefId}"/>
					<m type="I" value="${inlineEmail}"/>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(createGroupRes.Fault, 'CreateContactGroup should not fault');
		const groupCn = Array.isArray(createGroupRes.CreateContactResponse.cn)
			? createGroupRes.CreateContactResponse.cn[0] : createGroupRes.CreateContactResponse.cn;
		const groupId = groupCn.id;
		assert.exists(groupId, 'Group id should exist');
		const members = Array.isArray(groupCn.m) ? groupCn.m : (groupCn.m ? [groupCn.m] : []);
		assert.exists(members.find(m => m.type === 'C' && m.value === contactRefId), 'C member should exist');
		assert.exists(members.find(m => m.type === 'I' && m.value === inlineEmail), 'I member should exist');

		// Modify group with replace=1 and m op=reset — should return service.INVALID_REQUEST
		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${groupId}">
					<a n="type">group</a>
					<m op="reset"/>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);
		assert.match(modifyRes.Fault.Detail.Error.Code, /^service\.INVALID_REQUEST/,
			'Error code should be service.INVALID_REQUEST');
	});
});
