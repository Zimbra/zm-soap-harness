import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Sharing > Share Contact', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token, account1Id;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
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
	it('Functional | Share contacts folder with another account', async () => {
		// Create contact in account1
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">SharedFirst${common.getUniqueString()}</a>
					<a n="lastName">SharedLast${common.getUniqueString()}</a>
					<a n="email">shared${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// Get contacts folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
	});


	it('Functional | Grant read access on contacts folder', async () => {
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
	});


	it('Functional | Share contacts with create permission', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">Share3First${common.getUniqueString()}</a>
					<a n="lastName">Share3Last${common.getUniqueString()}</a>
					<a n="email">share3${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
	});
});
