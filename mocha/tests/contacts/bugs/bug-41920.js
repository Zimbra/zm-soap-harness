import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Bugs > Bug 41920 - Shared contact no duplicates', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token, account1Id;
	let account2Email, account2Token;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(res1.CreateAccountResponse.account)
			? res1.CreateAccountResponse.account[0] : res1.CreateAccountResponse.account;
		account1Id = acct1.id;
		account1Token = await soap.getAccountAuthToken(account1Email);

		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Token = await soap.getAccountAuthToken(account2Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Search shared contacts should not return duplicates', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName1</a>
					<a n="lastName">lastName1</a>
					<a n="email">firstname01@testsearch.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">firstName2</a>
					<a n="lastName">lastName2</a>
					<a n="email">firstname02@testsearch.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact" sortBy="nameAsc">
				<query>in:contacts</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Search should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
