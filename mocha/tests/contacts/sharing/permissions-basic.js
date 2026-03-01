import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Contacts > Sharing > Permissions Basic', function () {
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
	it('Smoke | Share contacts folder with read permission', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">PermFirst${common.getUniqueString()}</a>
					<a n="lastName">PermLast${common.getUniqueString()}</a>
					<a n="email">perm${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
	});


	it('Sanity | Share contacts folder with write permission', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">WriteFirst${common.getUniqueString()}</a>
					<a n="lastName">WriteLast${common.getUniqueString()}</a>
					<a n="email">write${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
	});


	it('Sanity | Share contacts folder with admin permission', async () => {
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">AdminFirst${common.getUniqueString()}</a>
					<a n="lastName">AdminLast${common.getUniqueString()}</a>
					<a n="email">admin${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not be a Fault');
	});
});
