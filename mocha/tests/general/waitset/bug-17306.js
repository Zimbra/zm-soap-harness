import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('General > WaitSet > Bug 17306', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountEmail;
	let accountId;
	let accountAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		accountEmail = `waitset${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		accountId = account.id;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Testcase to simulate the recreate waitset functionality', async () => {
		// SyncRequest
		const syncRes = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(syncRes.Fault, 'SyncRequest should not fault');
		const syncToken = syncRes.SyncResponse.token;

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

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="c">
				<add>
					<a id="${accountId}" token="${syncToken}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

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
});
