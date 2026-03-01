import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';

describe('Contacts > Contact Modify Group Reference', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let contactRefId, contactGroupId;
	const inlineEmail = `email${common.getUniqueString()}@domain.com`;

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

		// Create a ref contact
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;
		contactRefId = refCn.id;

		// Create group with C and I members
		const groupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="type">group</a>
					<m type="C" value="${contactRefId}"/>
					<m type="I" value="${inlineEmail}"/>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const groupCn = Array.isArray(groupRes.CreateContactResponse.cn)
			? groupRes.CreateContactResponse.cn[0] : groupRes.CreateContactResponse.cn;
		contactGroupId = groupCn.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Modify group reference - remove an inline member', async () => {
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactGroupId}">
					<a n="type">group</a>
					<m op="-" type="I" value="${inlineEmail}"/>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse.cn, 'Modified contact should exist');
	});


	it('Sanity | Modify group reference - add a contact member', async () => {
		const refRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First2${common.getUniqueString()}</a>
					<a n="lastName">Last2${common.getUniqueString()}</a>
					<a n="email">email2${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountToken
		);
		const refCn = Array.isArray(refRes.CreateContactResponse.cn)
			? refRes.CreateContactResponse.cn[0] : refRes.CreateContactResponse.cn;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail">
				<cn id="${contactGroupId}">
					<a n="type">group</a>
					<m op="+" type="C" value="${refCn.id}"/>
				</cn>
			</ModifyContactRequest>`, accountToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not be a Fault');
		assert.exists(modRes.ModifyContactResponse.cn, 'Modified contact should exist');
	});


	it('Sanity | Modify group reference with replace and op gives invalid request', async () => {
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${contactGroupId}">
					<a n="type">group</a>
					<m op="-" type="C" value="${contactRefId}"/>
				</cn>
			</ModifyContactRequest>`, accountToken, false
		);

		// Verify response
		assert.exists(modRes.Fault, 'Replace with op should be a Fault');
		const code = modRes.Fault?.Detail?.Error?.Code || '';
		assert.include(code, 'service.INVALID_REQUEST', 'Error code should be service.INVALID_REQUEST');
	});
});
