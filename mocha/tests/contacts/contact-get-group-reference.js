import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Contacts > Contact Get Group Reference', function () {
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
	it('Sanity | GetContacts with derefGroupMember for group with C and I types', async () => {
		const email = `email${common.getUniqueString()}@domain.com`;

		// Create a contact to reference as C type
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(refRes.Fault, 'Create ref contact should not be a Fault');
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;
		assert.exists(refCn.id, 'Reference contact id should exist');

		// Create group with C and I members
		const groupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<m type="C" value="${refCn.id}"/>
					<m type="I" value="${email}"/>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		assert.notExists(groupRes.Fault, 'Create group should not be a Fault');
		const groupCn = Array.isArray(groupRes.CreateContactResponse.cn)
			? groupRes.CreateContactResponse.cn[0] : groupRes.CreateContactResponse.cn;
		assert.exists(groupCn.id, 'Group contact id should exist');
		const groupMembers = Array.isArray(groupCn.m) ? groupCn.m : [groupCn.m];
		const cMember = groupMembers.find(m => m.type === 'C');
		assert.exists(cMember, 'C type member should exist in CreateContactResponse');
		assert.equal(cMember.value, refCn.id, 'C type member value should match ref contact id');
		const iMember = groupMembers.find(m => m.type === 'I');
		assert.exists(iMember, 'I type member should exist in CreateContactResponse');
		assert.equal(iMember.value, email, 'I type member value should match email');

		// Get contacts with derefGroupMember
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail" derefGroupMember="1">
				<cn id="${groupCn.id}"/>
			</GetContactsRequest>`, accountToken
		);
		assert.notExists(getRes.Fault, 'GetContacts should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		assert.exists(getCn.id, 'Contact id should exist in response');
		const getMembers = Array.isArray(getCn.m) ? getCn.m : [getCn.m];
		const getCMember = getMembers.find(m => m.type === 'C');
		assert.exists(getCMember, 'C type member should exist in GetContactsResponse');
		assert.equal(getCMember.value, refCn.id, 'C type member value should match ref contact id');
		const getIMember = getMembers.find(m => m.type === 'I');
		assert.exists(getIMember, 'I type member should exist in GetContactsResponse');
		assert.equal(getIMember.value, email, 'I type member value should match email');
	});
});
