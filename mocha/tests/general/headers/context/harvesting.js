import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('General > Headers > Context > Harvesting', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1AuthToken;
	let account2Email;
	let account2Id;
	const account3Id = '4069da09-3794-4d2a-ad16-fb2dad556dc4';

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `account${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');

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

		account1AuthToken = await soap.getAccountAuthToken(account1Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that using account (by name) for an invalid account returns PERMDENIED rather than NOSUCHACCOUNT', async () => {
		// BatchRequest
		const batchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<BatchRequest xmlns="urn:zimbra" onerror="stop">
				<GetInfoRequest xmlns="urn:zimbraAccount" sections="mbox" requestId="0"/>
				<GetFolderRequest xmlns="urn:zimbraMail" visible="0" requestId="1">
					<folder l="1"/>
				</GetFolderRequest>
			</BatchRequest>`, account1AuthToken, account2Email
		);

		// Verify response
		assert.exists(batchRes1.Fault, 'Should return Fault for accessing another account');
		assert.include(batchRes1.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Error code should be PERM_DENIED');
		const nonExistentEmail = `account${common.getUniqueString()}@${config.testDomain}`;

		// Send batch request
		const batchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<BatchRequest xmlns="urn:zimbra" onerror="stop">
				<GetInfoRequest xmlns="urn:zimbraAccount" sections="mbox" requestId="0"/>
				<GetFolderRequest xmlns="urn:zimbraMail" visible="0" requestId="1">
					<folder l="1"/>
				</GetFolderRequest>
			</BatchRequest>`, account1AuthToken, nonExistentEmail
		);

		// Verify response
		assert.exists(batchRes2.Fault, 'Should return Fault for non-existent account');
		assert.include(batchRes2.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Error code should be PERM_DENIED, not NO_SUCH_ACCOUNT');
	});


	it('Sanity | Verify that using account (by id) for an invalid account returns PERMDENIED rather than NOSUCHACCOUNT', async () => {
		// BatchRequest
		const batchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<BatchRequest xmlns="urn:zimbra" onerror="stop">
				<GetInfoRequest xmlns="urn:zimbraAccount" sections="mbox" requestId="0"/>
				<GetFolderRequest xmlns="urn:zimbraMail" visible="0" requestId="1">
					<folder l="1"/>
				</GetFolderRequest>
			</BatchRequest>`, account1AuthToken, account2Id
		);

		// Verify response
		assert.exists(batchRes1.Fault, 'Should return Fault for accessing another account');
		assert.include(batchRes1.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Error code should be PERM_DENIED');

		// Send batch request
		const batchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<BatchRequest xmlns="urn:zimbra" onerror="stop">
				<GetInfoRequest xmlns="urn:zimbraAccount" sections="mbox" requestId="0"/>
				<GetFolderRequest xmlns="urn:zimbraMail" visible="0" requestId="1">
					<folder l="1"/>
				</GetFolderRequest>
			</BatchRequest>`, account1AuthToken, account3Id
		);

		// Verify response
		assert.exists(batchRes2.Fault, 'Should return Fault for non-existent account');
		assert.include(batchRes2.Fault.Detail.Error.Code, 'service.PERM_DENIED',
			'Error code should be PERM_DENIED, not NO_SUCH_ACCOUNT');
	});
});
