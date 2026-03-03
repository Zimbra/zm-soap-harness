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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	});
});
