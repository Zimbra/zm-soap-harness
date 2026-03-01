import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > WaitSet > WaitSet Request Contacts', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;
	let account2Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `waitset${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `waitset${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'CreateAccountRequest should not fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		account2Id = acct2.id;
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
	it('Sanity | Test Case for WaitSetRequest (non blocking) for Contact changes', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="c">
				<add>
					<a id="${account1Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Create a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'CreateContactRequest should not fault');

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
		assert.exists(waitRes.WaitSetResponse, 'WaitSetResponse should exist');
	});


	it('Sanity | Test Case for WaitSetRequest (blocking) for Contact changes', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account2Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
				<add>
					<a id="${account2Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		assert.exists(waitSetRes.CreateWaitSetResponse.waitSet,
			'WaitSet id should exist');
		assert.exists(waitSetRes.CreateWaitSetResponse.seq,
			'WaitSet seq should exist');

		// Create a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'CreateContactRequest should not fault');
	});
});
