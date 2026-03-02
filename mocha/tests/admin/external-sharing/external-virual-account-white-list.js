import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > External Sharing > External Virual Account White List', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
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

	// Helper to get briefcase folder ID from GetFolderResponse
	function getBriefcaseId(folderRes) {
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const briefcase = Array.isArray(folders)
			? folders.find(f => f.name === 'Briefcase') : folders;
		return briefcase.id;
	}

	// Helper to clear ACL on a folder
	async function clearAcl(token, folderId) {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, token
		);
		assert.notExists(res.Fault, 'Clear ACL should not fault');
		assert.exists(res.FolderActionResponse.action, 'Action should exist');
	}

	// Tests
	it('Sanity | Verify zimbraExternalShareDomainWhitelistEnabled by default on any account that has default COS', async () => {
		// Create account
		const accountEmail = `test1.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase folder ID
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Clear and grant to subdomain — should succeed
		await clearAcl(accountToken, briefcaseId);
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant2.Fault, 'Grant to subdomain should not fault');
		assert.exists(grant2.FolderActionResponse, 'FolderActionResponse should exist');

		// Grant to other-domain — should succeed
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant3.Fault, 'Grant to other-domain should not fault');
		assert.exists(grant3.FolderActionResponse, 'FolderActionResponse should exist');

		// Grant to external — should succeed
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant4.Fault, 'Grant to external should not fault');
		assert.exists(grant4.FolderActionResponse, 'FolderActionResponse should exist');

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);
	});


	it('Sanity | Verify zimbraExternalShareDomainWhitelistEnabled TRUE on cos inherited by account', async () => {
		// Create COS with zimbraExternalShareDomainWhitelistEnabled=TRUE
		const cosName = `cos1.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		assert.equal(cos.name, cosName, 'COS name should match');
		const cosId = cos.id;

		// Create account with this COS
		const accountEmail = `test2.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase folder ID
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);

		// Grant to subdomain — should fail with PERM_DENIED
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.exists(grant2.Fault, 'Grant to subdomain should fault');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should fail with PERM_DENIED
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.exists(grant3.Fault, 'Grant to other-domain should fault');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should fail with PERM_DENIED
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.exists(grant4.Fault, 'Grant to external should fault');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);
	});


	it('Sanity | Verify zimbraExternalShareDomainWhitelistEnabled TRUE on account override COS value', async () => {
		// Create COS (default)
		const cosName = `cos2.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account with COS and account-level whitelist=TRUE
		const accountEmail = `test3.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth as account and get briefcase folder ID
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Grant to subdomain — should fail with PERM_DENIED
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.exists(grant2.Fault, 'Grant to subdomain should fault');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should fail with PERM_DENIED
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.exists(grant3.Fault, 'Grant to other-domain should fault');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should fail with PERM_DENIED
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.exists(grant4.Fault, 'Grant to external should fault');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);
	});


	it('Sanity | Verify disabling zimbraExternalShareDomainWhitelistEnabled on COS take effect on existing share 1', async () => {
		// Create COS (default — whitelist not enabled)
		const cosName = `cos3.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account with this COS
		const accountEmail = `test4.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase folder ID
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Initially grant to all — should succeed
		for (const email of [internalEmail, 'sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken
			);
			assert.notExists(grant.Fault, `Initial grant to ${email} should not fault`);
			assert.exists(grant.FolderActionResponse, 'FolderActionResponse should exist');
		}

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);

		// Modify COS to enable whitelist
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCosRequest xmlns="urn:zimbraAdmin">
				<id>${cosId}</id>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
			</ModifyCosRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyCosRequest should not fault');

		// Re-auth as account
		const accountToken2 = await soap.getAccountAuthToken(accountEmail);

		// Grant to internal — should still succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault after COS change');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Grant to subdomain — should now fail
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.example.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.exists(grant2.Fault, 'Grant to subdomain should fault after COS whitelist');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should now fail
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.exists(grant3.Fault, 'Grant to other-domain should fault after COS whitelist');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should now fail
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.exists(grant4.Fault, 'Grant to external should fault after COS whitelist');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		await clearAcl(accountToken2, briefcaseId);
	});


	it('Sanity | Verify disabling zimbraExternalShareDomainWhitelistEnabled on Account take effect on existing share 1', async () => {
		// Create COS (default)
		const cosName = `cos4.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account
		const accountEmail = `test5.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase folder ID
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Initially grant to all — should succeed
		for (const email of [internalEmail, 'sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken
			);
			assert.notExists(grant.Fault, `Initial grant to ${email} should not fault`);
			assert.exists(grant.FolderActionResponse, 'FolderActionResponse should exist');
		}

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);

		// Modify Account to enable whitelist
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccountRequest should not fault');

		// Re-auth as account
		const accountToken2 = await soap.getAccountAuthToken(accountEmail);

		// Grant to internal — should still succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Grant to subdomain — should now fail
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.example.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.exists(grant2.Fault, 'Grant to subdomain should fault');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should now fail
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.exists(grant3.Fault, 'Grant to other-domain should fault');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should now fail
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.exists(grant4.Fault, 'Grant to external should fault');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		await clearAcl(accountToken2, briefcaseId);
	});


	it('Sanity | Verify disabling zimbraExternalShareDomainWhitelistEnabled on COS take effect on existing share 2', async () => {
		// Create COS with zimbraExternalShareDomainWhitelistEnabled=TRUE
		const cosName = `cos5.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account — whitelist is already TRUE from COS
		const accountEmail = `test6.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Grant to internal — should succeed (whitelist only affects external)
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Subdomain, other-domain, external — should all fail
		for (const email of ['sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken, false
			);
			assert.exists(grant.Fault, `Grant to ${email} should fault with whitelist enabled`);
			assert.include(grant.Fault.Detail.Error.Code, 'service.PERM_DENIED');
		}

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);
	});


	it('Sanity | Verify disabling zimbraExternalShareDomainWhitelistEnabled on Account take effect on existing share 2', async () => {
		// Create COS (default)
		const cosName = `cos6.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account with account-level whitelist=TRUE
		const accountEmail = `test7.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// Subdomain, other-domain, external — should all fail
		for (const email of ['sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken, false
			);
			assert.exists(grant.Fault, `Grant to ${email} should fault with whitelist enabled`);
			assert.include(grant.Fault.Detail.Error.Code, 'service.PERM_DENIED');
		}

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);
	});


	it('Sanity | Verify zimbraExternalSharingEnabled=FALSE disables sharing to external whitelisted domains.', async () => {
		// Create COS with whitelist enabled and external sharing disabled
		const cosName = `cos7.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraExternalShareDomainWhitelistEnabled">TRUE</a>
				<a n="zimbraExternalSharingEnabled">FALSE</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account
		const accountEmail = `test8.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create internal account
		const internalEmail = `internal.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const briefcaseId = getBriefcaseId(folderRes);

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal should not fault');
		assert.exists(grant1.FolderActionResponse, 'FolderActionResponse should exist');

		// All external grants (subdomain, other-domain, external) — should fail
		for (const email of ['sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken, false
			);
			assert.exists(grant.Fault, `Grant to ${email} should fault`);
			assert.include(grant.Fault.Detail.Error.Code, 'service.PERM_DENIED');
		}

		// Clear ACL
		await clearAcl(accountToken, briefcaseId);
	});
});
