import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > External Sharing > External Virual Account Policy', function () {
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

	// Tests
	it('Smoke | Verify zimbraExternalSharingEnabled by default on any account that has default COS', async () => {
		// Create domain with zimbraInternalSharingCrossDomainEnabled=FALSE
		const domainName = `test${common.getUniqueString()}.com`;
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraInternalSharingCrossDomainEnabled">FALSE</a>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domainRes.Fault, 'CreateDomainRequest should not fault');

		// Create account on the domain
		const accountEmail = `test1.${common.getUniqueString()}@${domainName}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Create internal, other-domain, and subdomain accounts
		const internalEmail = `internal.${common.getUniqueString()}@${domainName}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${internalEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const otherDomain = `otherzcs${common.getUniqueString()}.com`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${otherDomain}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		const otherEmail = `account1${common.getUniqueString()}@${otherDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${otherEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const subDomain = `sub${common.getUniqueString()}.${domainName}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${subDomain}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		const subEmail = `account1${common.getUniqueString()}@${subDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${subEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account and get briefcase folder ID
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const briefcase = Array.isArray(folders)
			? folders.find(f => f.name === 'Briefcase') : folders;
		assert.exists(briefcase, 'Briefcase folder should exist');
		const briefcaseId = briefcase.id;

		// Grant guest sharing to internal account — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal account should not fault');

		// Grant guest sharing to subdomain account — should succeed
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${subEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant2.Fault, 'Grant to subdomain account should not fault');

		// Grant guest sharing to other-domain account — should succeed
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${otherEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant3.Fault, 'Grant to other-domain account should not fault');

		// Grant guest sharing to external account — should succeed
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant4.Fault, 'Grant to external account should not fault');

		// Clear ACL
		const clearRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(clearRes.Fault, 'Clear ACL should not fault');
		assert.exists(clearRes.FolderActionResponse.action, 'Action should exist in response');
	});


	it('Sanity | Verify zimbraExternalSharingEnabled FALSE on cos inherited by account', async () => {
		// Create COS with zimbraExternalSharingEnabled=FALSE
		const cosName = `cos1.${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraExternalSharingEnabled">FALSE</a>
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

		// Create internal account for sharing
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
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const briefcase = Array.isArray(folders)
			? folders.find(f => f.name === 'Briefcase') : folders;
		const briefcaseId = briefcase.id;

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal account should not fault');

		// Grant to subdomain — should fail with PERM_DENIED
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.isString(grant2.Fault.Detail.Error.Code, 'Grant to subdomain should fault');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should fail with PERM_DENIED
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.isString(grant3.Fault.Detail.Error.Code, 'Grant to other-domain should fault');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should fail with PERM_DENIED
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.isString(grant4.Fault.Detail.Error.Code, 'Grant to external should fault');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		const clearRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(clearRes.Fault, 'Clear ACL should not fault');
		assert.exists(clearRes.FolderActionResponse.action, 'Action should exist in response');
	});


	it('Sanity | Verify zimbraExternalSharingEnabled FALSE on account override COS value', async () => {
		// Create COS (default, no zimbraExternalSharingEnabled override)
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

		// Create account with COS and account-level zimbraExternalSharingEnabled=FALSE
		const accountEmail = `test3.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraExternalSharingEnabled">FALSE</a>
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
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const briefcase = Array.isArray(folders)
			? folders.find(f => f.name === 'Briefcase') : folders;
		const briefcaseId = briefcase.id;

		// Grant to internal — should succeed
		const grant1 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="${internalEmail}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(grant1.Fault, 'Grant to internal account should not fault');

		// Grant to subdomain — should fail with PERM_DENIED
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.${config.testDomain}" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.isString(grant2.Fault.Detail.Error.Code, 'Grant to subdomain should fault');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should fail with PERM_DENIED
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.isString(grant3.Fault.Detail.Error.Code, 'Grant to other-domain should fault');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should fail with PERM_DENIED
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken, false
		);
		assert.isString(grant4.Fault.Detail.Error.Code, 'Grant to external should fault');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		const clearRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken
		);
		assert.notExists(clearRes.Fault, 'Clear ACL should not fault');
		assert.exists(clearRes.FolderActionResponse.action, 'Action should exist in response');
	});


	it('Sanity | Verify disabling zimbraExternalSharingEnabled on COS take effect on existing share', async () => {
		// Create COS (default — sharing enabled)
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
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const briefcase = Array.isArray(folders)
			? folders.find(f => f.name === 'Briefcase') : folders;
		const briefcaseId = briefcase.id;

		// Initially grant to all — should succeed (sharing enabled)
		for (const email of [internalEmail, 'sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken
			);
			assert.notExists(grant.Fault, `Initial grant to ${email} should not fault`);
		}

		// Clear ACL
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken
		);

		// Modify COS to disable external sharing
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCosRequest xmlns="urn:zimbraAdmin">
				<id>${cosId}</id>
				<a n="zimbraExternalSharingEnabled">FALSE</a>
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

		// Grant to subdomain — should now fail
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.example.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.isString(grant2.Fault.Detail.Error.Code, 'Grant to subdomain should fault after COS change');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should now fail
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.isString(grant3.Fault.Detail.Error.Code, 'Grant to other-domain should fault after COS change');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should now fail
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.isString(grant4.Fault.Detail.Error.Code, 'Grant to external should fault after COS change');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		const clearRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken2
		);
		assert.notExists(clearRes.Fault, 'Clear ACL should not fault');
		assert.exists(clearRes.FolderActionResponse.action, 'Action should exist in response');
	});


	it('Sanity | Verify disabling zimbraExternalSharingEnabled on Account take effect on existing share', async () => {
		// Create COS (default — sharing enabled)
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

		// Create account with this COS
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
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const briefcase = Array.isArray(folders)
			? folders.find(f => f.name === 'Briefcase') : folders;
		const briefcaseId = briefcase.id;

		// Initially grant to all — should succeed (sharing enabled)
		for (const email of [internalEmail, 'sub@sub.example.com', 'user@otherdomain.com', 'zimbraexttest@yahoo.com']) {
			const grant = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${briefcaseId}">
						<grant gt="guest" inh="1" d="${email}" perm="r"/>
					</action>
				</FolderActionRequest>`, accountToken
			);
			assert.notExists(grant.Fault, `Initial grant to ${email} should not fault`);
		}

		// Clear ACL
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken
		);

		// Modify Account to disable external sharing
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraExternalSharingEnabled">FALSE</a>
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
		assert.notExists(grant1.Fault, 'Grant to internal should not fault after account change');

		// Grant to subdomain — should now fail
		const grant2 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="sub@sub.example.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.isString(grant2.Fault.Detail.Error.Code, 'Grant to subdomain should fault after account change');
		assert.include(grant2.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to other-domain — should now fail
		const grant3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="user@otherdomain.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.isString(grant3.Fault.Detail.Error.Code, 'Grant to other-domain should fault after account change');
		assert.include(grant3.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Grant to external — should now fail
		const grant4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="guest" inh="1" d="zimbraexttest@yahoo.com" perm="r"/>
				</action>
			</FolderActionRequest>`, accountToken2, false
		);
		assert.isString(grant4.Fault.Detail.Error.Code, 'Grant to external should fault after account change');
		assert.include(grant4.Fault.Detail.Error.Code, 'service.PERM_DENIED');

		// Clear ACL
		const clearRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="update">
					<acl/>
				</action>
			</FolderActionRequest>`, accountToken2
		);
		assert.notExists(clearRes.Fault, 'Clear ACL should not fault');
		assert.exists(clearRes.FolderActionResponse.action, 'Action should exist in response');
	});
});
