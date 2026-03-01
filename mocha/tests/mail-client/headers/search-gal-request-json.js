import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Headers > JSON > SearchGALRequest JSON', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	let domainName;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		domainName = `domain${uid}.testgal.com`;
		account1Name = `user1${uid}`;
		account2Name = `user2${uid}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">Domain for testing SyncGalRequest</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}@${domainName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}@${domainName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const galSyncName = `galsync.${uid}@${domainName}`;
		const galRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateGalSyncAccountRequest xmlns="urn:zimbraAdmin" name="name${uid}" type="zimbra" domain="${domainName}" server="${config.zimbraServer}">
				<account by="name">${galSyncName}</account>
				<password>${config.accountPassword}</password>
			</CreateGalSyncAccountRequest>`, adminAuthToken
		);

		if (galRes.CreateGalSyncAccountResponse) {
			const allAccts = await soap.makeSOAPEnvelopeAdmin(
				`<GetAllAccountsRequest xmlns="urn:zimbraAdmin">
					<domain by="name">${domainName}</domain>
				</GetAllAccountsRequest>`, adminAuthToken
			);
			const accounts = allAccts.GetAllAccountsResponse?.account;
			const acctList = Array.isArray(accounts) ? accounts : accounts ? [accounts] : [];
			const galAcct = acctList.find(a => a.name && a.name.includes('galsync.'));
			if (galAcct) {
				await soap.makeSOAPEnvelopeAdmin(
					`<SyncGalAccountRequest xmlns="urn:zimbraAdmin">
						<account id="${galAcct.id}">
							<datasource by="name">InternalGal</datasource>
						</account>
					</SyncGalAccountRequest>`, adminAuthToken
				);
			}
		}
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
	it('Functional | JSON - verify SearchGalRequest supports multi-valued attributes', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(`${account1Name}@${domainName}`);

		// Send search gal request
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount">
				<name>${account2Name}@${domainName}</name>
			</SearchGalRequest>`, acctAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchGalResponse, 'SearchGalResponse should exist');
	});
});
