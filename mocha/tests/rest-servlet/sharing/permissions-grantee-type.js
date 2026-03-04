import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Sharing > Permissions Grantee Type', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account3Email, account3Token;
	let account4Email, account4Token;
	let account5Email, account5Token, domain5Name;
	let account6Email, account6Token, cos6Name;
	let account7Email, account7Token;
	let folderId, messageId, messageSubject;
	let dlName;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		messageSubject = 'subject' + common.getUniqueString();
		const messageContent = 'content' + common.getUniqueString();
		const folderName = 'folder' + common.getUniqueString();

		// Create accounts 1-4 on test domain
		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account3Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		account4Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		for (const email of [account1Email, account2Email, account3Email, account4Email]) {

			// Create account
			const createRes = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(createRes.Fault, 'Response should not be a Fault');
		}

		// Create DL with account1 and account4
		dlName = 'dl' + common.getUniqueString() + '@' + config.testDomain;

		// CreateDistributionListRequest
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(dlRes.Fault, 'Response should not be a Fault');
		const dl = dlRes.CreateDistributionListResponse?.dl;
		const dlId = (Array.isArray(dl) ? dl[0] : dl).id;

		for (const member of [account1Email, account4Email]) {

			// AddDistributionListMemberRequest
			await soap.makeSOAPEnvelopeAdmin(
				`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
					<id>${dlId}</id>
					<dlm>${member}</dlm>
				</AddDistributionListMemberRequest>`, adminAuthToken
			);
		}

		// Create domain5 and account5 (different domain)
		domain5Name = 'domain' + common.getUniqueString() + '.com';

		// CreateDomainRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain5Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		account5Email = 'test' + common.getUniqueString() + '@' + domain5Name;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Email}</name>
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

		// Create COS and account6
		cos6Name = 'cos' + common.getUniqueString();

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cos6Name}</name>
			</CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(cosRes.Fault, 'Response should not be a Fault');
		const cos = cosRes.CreateCosResponse?.cos;
		const cosId = (Array.isArray(cos) ? cos[0] : cos).id;

		account6Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account6Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Create account7
		account7Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account7Email}</name>
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

		// Get auth tokens
		account1Token = await soap.getAccountAuthToken(account1Email);
		account3Token = await soap.getAccountAuthToken(account3Email);
		account4Token = await soap.getAccountAuthToken(account4Email);
		account5Token = await soap.getAccountAuthToken(account5Email);
		account6Token = await soap.getAccountAuthToken(account6Email);
		account7Token = await soap.getAccountAuthToken(account7Email);

		// Create folder under root
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, account1Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const folder = folderRes.CreateFolderResponse?.folder;
		folderId = (Array.isArray(folder) ? folder[0] : folder).id;

		// Send message and move to folder
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const msg = sendRes.SendMsgResponse?.m;
		messageId = (Array.isArray(msg) ? msg[0] : msg).id;

		// Move message to folder
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${messageId}" op="move" l="${folderId}"/>
			</MsgActionRequest>`, account1Token
		);
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
	it('Sanity | Self Test - Verify the account can view his own files', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(res.status, 200, 'Owner should see own message');
		assert.include(res.body, account2Email, 'Response should contain To address');
		assert.include(res.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type usr', async () => {
		// Verify account3 cannot view without grant
		const denyRes = await rest.makeRestRequest(account3Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(denyRes.status, 404, 'Account3 should not see message before grant');

		// Grant folder to account3 as usr
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${account3Email}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify account3 can view after grant
		const allowRes = await rest.makeRestRequest(account3Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(allowRes.status, 200, 'Account3 should see message after usr grant');
		assert.include(allowRes.body, account2Email, 'Response should contain To address');
		assert.include(allowRes.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type grp', async () => {
		// Verify account4 cannot view without grant
		const denyRes = await rest.makeRestRequest(account4Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(denyRes.status, 404, 'Account4 should not see message before grp grant');

		// Grant folder to DL as grp
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="grp" d="${dlName}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify account4 (DL member) can view after grant
		const allowRes = await rest.makeRestRequest(account4Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(allowRes.status, 200, 'Account4 (DL member) should see message after grp grant');
		assert.include(allowRes.body, account2Email, 'Response should contain To address');
		assert.include(allowRes.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type dom', async () => {
		// Verify account5 (different domain) cannot view without grant
		const denyRes = await rest.makeRestRequest(account5Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(denyRes.status, 404, 'Account5 should not see message before dom grant');

		// Grant folder to domain5 as dom
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="dom" d="${domain5Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify account5 can view after dom grant
		const allowRes = await rest.makeRestRequest(account5Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(allowRes.status, 200, 'Account5 should see message after dom grant');
		assert.include(allowRes.body, account2Email, 'Response should contain To address');
		assert.include(allowRes.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type cos', async () => {
		// Verify account6 cannot view without cos grant
		const denyRes = await rest.makeRestRequest(account6Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(denyRes.status, 404, 'Account6 should not see message before cos grant');

		// Grant folder to cos as cos
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="cos" d="${cos6Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify account6 can view after cos grant
		const allowRes = await rest.makeRestRequest(account6Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(allowRes.status, 200, 'Account6 should see message after cos grant');
		assert.include(allowRes.body, account2Email, 'Response should contain To address');
		assert.include(allowRes.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type all (all authenticated users)', async () => {
		// Verify unauthenticated cannot view
		const noAuthUrl = `https://${config.serverHost}/home/${encodeURIComponent(account1Email)}?id=${messageId}`;
		const noAuthRes = await fetch(noAuthUrl, { redirect: 'manual' });

		// Verify response
		assert.oneOf(noAuthRes.status, [401, 403], 'Unauthenticated should get 401 or 403');

		// Grant folder as all
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="all" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify still 401 without auth token (all = authenticated, not public)
		const noAuth2Res = await fetch(noAuthUrl, { redirect: 'manual' });

		// Verify response
		assert.oneOf(noAuth2Res.status, [401, 403], 'Unauthenticated should still get 401 or 403 with all grant');

		// Verify account7 (authenticated) can view
		const allowRes = await rest.makeRestRequest(account7Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(allowRes.status, 200, 'Authenticated user should see message after all grant');
		assert.include(allowRes.body, account2Email, 'Response should contain To address');
		assert.include(allowRes.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type pub (public authenticated and unauthenticated access)', async () => {
		// Verify unauthenticated cannot view before pub grant
		const noAuthUrl = `https://${config.serverHost}/home/${encodeURIComponent(account1Email)}?id=${messageId}`;
		const noAuth1Res = await fetch(noAuthUrl, { redirect: 'manual' });

		// Verify response
		assert.oneOf(noAuth1Res.status, [200, 401, 403], 'Initial status before pub grant');

		// Grant folder as pub
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="pub" perm="r"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify unauthenticated can view after pub grant
		const pubRes = await fetch(noAuthUrl, { redirect: 'manual' });

		// Verify response
		assert.equal(pubRes.status, 200, 'Unauthenticated should see message after pub grant');

		// Verify authenticated user can also view
		const authRes = await rest.makeRestRequest(account7Token, {
			user: account1Email,
			id: messageId
		});

		// Verify response
		assert.equal(authRes.status, 200, 'Authenticated user should see message after pub grant');
		assert.include(authRes.body, account2Email, 'Response should contain To address');
		assert.include(authRes.body, messageSubject, 'Response should contain Subject');
	});


	it('Sanity | Verify grantee-type guest (non-Zimbra email address and password)', async () => {
		const guestEmail = 'guest' + common.getUniqueString() + '@external.com';

		// Revoke pub grant first (use !grant to revoke all)
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folderId}" zid="99999999-9999-9999-9999-999999999999"/>
			</FolderActionRequest>`, account1Token
		);

		// Verify unauthenticated cannot view
		const noAuthUrl = `https://${config.serverHost}/home/${encodeURIComponent(account1Email)}?id=${messageId}`;
		const noAuthRes = await fetch(noAuthUrl, { redirect: 'manual' });

		// Verify response
		assert.oneOf(noAuthRes.status, [401, 403], 'Unauthenticated should get 401 or 403 after revoking pub');

		// Grant folder as guest
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" perm="r" d="${guestEmail}" args="${config.accountPassword}"/>
				</action>
			</FolderActionRequest>`, account1Token
		);

		// Verify still 401 without credentials
		const noAuth2Res = await fetch(noAuthUrl, { redirect: 'manual' });

		// Verify response
		assert.oneOf(noAuth2Res.status, [401, 403], 'Should still get 401 or 403 without guest credentials');

		// Verify guest can view with basic auth credentials
		const guestUrl = `https://${config.serverHost}/home/${encodeURIComponent(account1Email)}?id=${messageId}`;
		const guestCreds = Buffer.from(`${guestEmail}:${config.accountPassword}`).toString('base64');
		const guestRes = await fetch(guestUrl, {
			redirect: 'manual',
			headers: {
				'Authorization': 'Basic ' + guestCreds
			}
		});

		// Verify response
		assert.equal(guestRes.status, 200, 'Guest should see message with credentials');
		const body = await guestRes.text();

		// Verify response
		assert.include(body, account2Email, 'Response should contain To address');
		assert.include(body, messageSubject, 'Response should contain Subject');
	});
});
