import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 78970', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | DL not expanded consistently in GetMsgRequest', async () => {
		// Create accounts
		const account1Email = `test1${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test2${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test3${common.getUniqueString()}@${testDomain}`;
		const listName = `list1${common.getUniqueString()}@${testDomain}`;

		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');

		// Create DL and add members
		const createDLRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${listName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(createDLRes.Fault, 'CreateDistributionListRequest should not fault');
		const dlId = Array.isArray(createDLRes.CreateDistributionListResponse.dl)
			? createDLRes.CreateDistributionListResponse.dl[0].id
			: createDLRes.CreateDistributionListResponse.dl.id;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		// Grant sendToDistList to account3
		await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="dl" by="name">${listName}</target>
				<grantee type="usr" by="name">${account3Email}</grantee>
				<right>sendToDistList</right>
			</GrantRightRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<FlushCacheRequest xmlns="urn:zimbraAdmin">
				<cache type="galgroup"/>
			</FlushCacheRequest>`, adminAuthToken
		);

		// Wait for cache flush to propagate
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account1 sends message to DL and account3
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = 'Subject of the message is testing bug.';
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${listName}"/>
					<e t="t" a="${account3Email}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> Content in the message is testing bug. </content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Account3 searches for the message (with retries for delivery)
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		let searchRes;
		await new Promise(resolve => setTimeout(resolve, 5000));
		searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account3AuthToken
			);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		assert.exists(msgs[0], 'Message should be found');

		// Get message with needExp=1 (retry to allow DL expansion to be consistent)
		let dlEntry;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) {
				await soap.makeSOAPEnvelopeAdmin(
					`<FlushCacheRequest xmlns="urn:zimbraAdmin">
						<cache type="galgroup"/>
					</FlushCacheRequest>`, adminAuthToken
				);
				await new Promise(resolve => setTimeout(resolve, 3000));
			}
			const getMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${msgs[0].id}" needExp="1"/>
				</GetMsgRequest>`, account3AuthToken
			);
			assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
			const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
				? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
			assert.exists(getMsg.id, 'message id should exist');
			const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
				? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;

			// Verify DL expansion attributes (case-insensitive match)
			const emailAddrs = Array.isArray(msg.e) ? msg.e : [msg.e];
			const listNameLower = listName.toLowerCase();
			dlEntry = emailAddrs.find(
				e => e.a && e.a.toLowerCase() === listNameLower
			);
			if (dlEntry && (dlEntry.isGroup || dlEntry.exp)) break;
		}
		assert.exists(dlEntry, 'DL entry should exist in email addresses');
		assert.ok(
			dlEntry.isGroup === true || dlEntry.isGroup === 1
			|| dlEntry.isGroup === '1' || dlEntry.isGroup === 'true',
			`isGroup should be truthy, got: ${JSON.stringify(dlEntry.isGroup)} (type: ${typeof dlEntry.isGroup})`
		);
		assert.ok(
			dlEntry.exp === true || dlEntry.exp === 1
			|| dlEntry.exp === '1' || dlEntry.exp === 'true',
			`exp should be truthy, got: ${JSON.stringify(dlEntry.exp)} (type: ${typeof dlEntry.exp})`
		);
	});
});
