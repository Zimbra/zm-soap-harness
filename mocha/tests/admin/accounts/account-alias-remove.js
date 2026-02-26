import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Account Alias Remove', function () {
	let testAccount1, testAccount2, testAccount3, testAccount4;
	let account1Id, account2Id, account3Id, account4Id;
	let aliasName, aliasName1, aliasName1a, aliasName1b, alias2Name, alias3Name;
	let aliasName2, aliasName3, aliasBlank, aliasNumbers, aliasSpchar;
	let domainName, dlName, dlId;
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		testAccount1 = `test1.${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `test2.${common.getUniqueString()}@${config.testDomain}`;
		testAccount3 = `test3.${common.getUniqueString()}@${config.testDomain}`;
		testAccount4 = `test4.${common.getUniqueString()}@${config.testDomain}`;

		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount1, testAccount1);
		account1Id = res1.accountId;

		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount2, testAccount2);
		account2Id = res2.accountId;

		const res3 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount3, testAccount3);
		account3Id = res3.accountId;

		const res4 = await soap.createAccountByNameAndEmailAddress(adminAuthToken, testAccount4, testAccount4);
		account4Id = res4.accountId;

		const ts = common.getUniqueString();
		aliasName = `alias.name.${ts}@${config.testDomain}`;
		aliasName1 = `alias.name1.${ts}@${config.testDomain}`;
		aliasName1a = `alias.name1a.${ts}@${config.testDomain}`;
		aliasName1b = `alias.name1b.${ts}@${config.testDomain}`;
		alias2Name = `alias.2.${ts}@${config.testDomain}`;
		alias3Name = `alias.3.${ts}@${config.testDomain}`;

		aliasName2 = `alias01`;
		aliasName3 = `alias@non.existing.domain`;
		aliasBlank = ``;
		aliasNumbers = `1234566`;
		aliasSpchar = `:''<//\\\\`;

		domainName = `dl.example.${common.getUniqueString()}.com`;
		dlName = `testList@${domainName}`;

		const createDomReq =
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">Domain for distribution list testing</a>
			</CreateDomainRequest>`;
		const createDomRes = await soap.makeSOAPEnvelopeAdmin(createDomReq, adminAuthToken);

		const createDlReq =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`;
		const createDlRes = await soap.makeSOAPEnvelopeAdmin(createDlReq, adminAuthToken);

		dlId = createDlRes.CreateDistributionListResponse.dl[0].id;
	});

	after(async function () {
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuthToken);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuthToken);
		if (testAccount3) await soap.deleteAccount(testAccount3, adminAuthToken);
		if (testAccount4) await soap.deleteAccount(testAccount4, adminAuthToken);

		if (domainName) {
			const domRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetDomainRequest xmlns="urn:zimbraAdmin">
					<domain by="name">${domainName}</domain>
				</GetDomainRequest>`, adminAuthToken
			);
			if (domRes.GetDomainResponse) {
				const id = domRes.GetDomainResponse.domain[0].id;
				await soap.makeSOAPEnvelopeAdmin(
					`<DeleteDomainRequest xmlns="urn:zimbraAdmin"><id>${id}</id></DeleteDomainRequest>`, adminAuthToken
				);
			}
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Remove an alias from an account', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.RemoveAccountAliasResponse,
			'Alias should be removed successfully');
	});


	it('Regression | Remove an invalid alias (without domain name) from an account', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName2}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Should return INVALID_REQUEST');
	});


	it('Regression | Remove an invalid alias (with non existing domain name) from an account', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName3}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');

		const code = response.Fault.Detail.Error.Code;
		assert.isTrue(code.includes('account.NO_SUCH_DOMAIN') || code.includes('account.NO_SUCH_ALIAS'),
			'Should return NO_SUCH_DOMAIN or NO_SUCH_ALIAS');
	});


	it('Regression | Remove an alias with name as blank, spchar, numbers', async () => {
		const aliases = [aliasBlank, aliasSpchar, aliasNumbers];
		for (const alias of aliases) {
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
					<id>${account1Id}</id>
					<alias>${alias}</alias>
				</RemoveAccountAliasRequest>`, adminAuthToken
			);
			assert.exists(response.Fault, `Should have a Fault for ${alias}`);

			const code = response.Fault.Detail.Error.Code;
			assert.isTrue(code.includes('service.INVALID_REQUEST') || code.includes('service.PARSE_ERROR'),
				`Should return INVALID_REQUEST or PARSE_ERROR for ${alias}`);
		}
	});


	it('Regression | Remove already deleted alias from the account', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');
		assert.include(response.Fault.Detail.Error.Code, 'account.NO_SUCH_ALIAS',
			'Should return NO_SUCH_ALIAS');
	});


	it('Functional | Remove an alias from an account without removing alias from distribution list', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName1}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${aliasName1}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName1}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);

		const getDlResponse = await soap.makeSOAPEnvelopeAdmin(
			`<GetDistributionListRequest xmlns="urn:zimbraAdmin">
				<dl by="id">${dlId}</dl>
			</GetDistributionListRequest>`, adminAuthToken
		);

		const dlms = getDlResponse.GetDistributionListResponse.dl[0].dlm || [];
		const exactMatch = dlms.find(dlm => dlm._content === aliasName1);
		assert.notExists(exactMatch, 'Alias should be removed from DL');
	});


	it('Regression | Remove an alias from the distribution list without removing account from the distribution list', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<alias>${aliasName1a}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${aliasName1a}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<RemoveDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${aliasName1a}</dlm>
			</RemoveDistributionListMemberRequest>`, adminAuthToken
		);

		const searchResponse = await soap.makeSOAPEnvelopeAdmin(
			`<SearchAccountsRequest xmlns="urn:zimbraAdmin">
				<query>zimbraId=${account2Id}</query>
			</SearchAccountsRequest>`, adminAuthToken
		);
		const acct = searchResponse.SearchAccountsResponse.account && searchResponse.SearchAccountsResponse.account[0];
		assert.exists(acct, 'Account should be found');

		const acctAlias = acct.a.find(attr => attr.n === 'zimbraMailAlias' && attr._content === aliasName1a);
		assert.exists(acctAlias, 'Alias should still be present on the account');
	});


	it('Regression | Delete an accountThe alias of that account added in the distribution list should also get deleted from distribution list', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<alias>${aliasName1b}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${aliasName1b}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		testAccount3 = null; // Prevent deletion in after hook

		const getDlResponse = await soap.makeSOAPEnvelopeAdmin(
			`<GetDistributionListRequest xmlns="urn:zimbraAdmin">
				<dl by="id">${dlId}</dl>
			</GetDistributionListRequest>`, adminAuthToken
		);
		const dlms = getDlResponse.GetDistributionListResponse.dl[0].dlm || [];
		const exactMatch = dlms.find(dlm => dlm._content === aliasName1b);
		assert.notExists(exactMatch,
			'Alias should be removed from DL along with the deleted account');
	});


	it('Functional | Verify that deleting the original account deletes the aliases as well', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account4Id}</id>
				<alias>${alias2Name}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// test auth to alias
		const auth1 = await soap.getAccountAuthToken(alias2Name, config.accountPassword);
		assert.exists(auth1, 'Should authenticate against alias');

		// delete account
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account4Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		testAccount4 = null;

		// try auth to account4 manually
		const authResAcct = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account4Id}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`
		);
		assert.exists(authResAcct.Fault);
		assert.include(authResAcct.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// try auth to alias manually
		const authResAlias = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${alias2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`
		);
		assert.exists(authResAlias.Fault);
		assert.include(authResAlias.Fault.Detail.Error.Code, 'account.AUTH_FAILED');
	});


	it('Functional | Verify that the original account does not get deleted if alias is deleted', async () => {
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${alias3Name}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		await soap.getAccountAuthToken(alias3Name, config.accountPassword);

		await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${alias3Name}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);

		const authResAlias = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${alias3Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`
		);
		assert.exists(authResAlias.Fault);
		assert.include(authResAlias.Fault.Detail.Error.Code, 'account.AUTH_FAILED');

		// should still be able to auth to original account
		const acctAuth = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		assert.exists(acctAuth);
	});


	it('Functional | Create an alias with same name as that deleted for some other account', async () => {
		// Because account4 was deleted, create a new one to mimic "some other account" and add/remove an alias
		const anotherAcctReq = await soap.createAccountByNameAndEmailAddress(adminAuthToken, `test5.${common.getUniqueString()}@${config.testDomain}`);
		const anotherAcctId = anotherAcctReq.accountId;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${anotherAcctId}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${anotherAcctId}</id>
				<alias>${aliasName}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);

		const response = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<alias>${aliasName}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.AddAccountAliasResponse,
			'AddAccountAliasResponse should exist');

		await soap.deleteAccount(`test5.${common.getUniqueString()}@${config.testDomain}`, adminAuthToken);
	});


	it('Functional | Verify that one cannot send mail to a deleted alias', async () => {
		// Add alias to account2
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<alias>${alias2Name}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

		const subject = `Subject_${common.getUniqueString()}`;
		const sendResponse = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${alias2Name}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, auth2
		);
		assert.notExists(sendResponse.Fault, 'Response should not be a Fault');
		assert.exists(sendResponse.SendMsgResponse,
			'SendMsgResponse should exist');

		await soap.makeSOAPEnvelopeAdmin(
			`<RemoveAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<alias>${alias2Name}</alias>
			</RemoveAccountAliasRequest>`, adminAuthToken
		);

		// Sending mail again to the deleted alias
		const sendResponse2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${alias2Name}"/>
					<su>${subject}</su>
					<mp ct="text/plain"><content>content</content></mp>
				</m>
			</SendMsgRequest>`, auth2
		);
		// XML expects NO_SUCH_ACCOUNT if the LMTP doesn't accept it,
		// or if MTA accepts it we search for bounce. Since this is strict asserting on SendMsg failure:
		if (sendResponse2.Fault) {
			const code = sendResponse2.Fault.Detail.Error.Code;
			assert.isTrue(code.includes('mail.NO_SUCH_ACCOUNT') || code.includes('account.NO_SUCH_ACCOUNT') || code.includes('mail.SEND_ABORTED_ADDRESS_FAILURE'),
				'Should be NO_SUCH_ACCOUNT or SEND_ABORTED_ADDRESS_FAILURE');
		} else {
			assert.notExists(sendResponse2.Fault, 'Response should not be a Fault');
			assert.exists(sendResponse2.SendMsgResponse, "MTA accepted message for bounce");
		}
	});
});
