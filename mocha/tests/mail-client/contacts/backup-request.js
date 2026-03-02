import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Contacts > Backup Request', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	let account1Id, account2Id;
	const uid = common.getUniqueString();
	const firstname = `Contact.${uid}`;
	const lastname = `Name.${uid}`;
	const mailid = `email.${uid}@domain.com`;
	const newEmail = `email${uid}@gmail.com`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Name = `cont_backup.${uid}a@${config.testDomain}`;
		account2Name = `cont_backup.${uid}b@${config.testDomain}`;

		// Create account1
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct1 = Array.isArray(res1.CreateAccountResponse?.account)
			? res1.CreateAccountResponse.account[0] : res1.CreateAccountResponse?.account;
		account1Id = acct1?.id;

		// Create account2
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct2 = Array.isArray(res2.CreateAccountResponse?.account)
			? res2.CreateAccountResponse.account[0] : res2.CreateAccountResponse?.account;
		account2Id = acct2?.id;
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
	it.skip('Sanity | Verify that after backup and restore an account with a Contact, contact is restored', async () => {
		// Login to account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${mailid}</a>
				</cn>
			</CreateContactRequest>`, acct1Auth
		);
		assert.notExists(createRes.Fault, 'CreateContactRequest should not fault');
		const cn = Array.isArray(createRes.CreateContactResponse?.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse?.cn;
		assert.exists(cn, 'Contact should be created');
		const contactId = cn.id;
		assert.exists(contactId, 'Contact id should exist');

		// Backup the account (full)
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		// Delete the account
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore the account
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account1Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		// Re-authenticate after restore
		const acct1AuthNew = await soap.getAccountAuthToken(account1Name);

		// Verify the contact is restored
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, acct1AuthNew
		);
		assert.notExists(getRes.Fault, 'GetContactsRequest should not fault');
		assert.exists(getRes.GetContactsResponse, 'GetContactsResponse should exist');
		const resCn1 = Array.isArray(getRes.GetContactsResponse?.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse?.cn;
		assert.exists(resCn1, 'Restored contact should exist');
	});


	it.skip('Sanity | Backup (incremental) and restore an account with a Contact Verify that after backup and restore the correct Contact is restored', async () => {
		// Login to account2
		const acct2Auth = await soap.getAccountAuthToken(account2Name);

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${mailid}</a>
				</cn>
			</CreateContactRequest>`, acct2Auth
		);
		assert.notExists(createRes.Fault, 'CreateContactRequest should not fault');
		const cn = Array.isArray(createRes.CreateContactResponse?.cn)
			? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse?.cn;
		assert.exists(cn, 'Contact should be created');
		const contactId = cn.id;
		assert.exists(contactId, 'Contact id should exist');

		// Full backup first
		const fullBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(fullBackup.Fault, 'Full BackupRequest should not fault');
		assert.exists(fullBackup.BackupResponse, 'Full BackupResponse should exist');

		// Re-auth and modify the contact
		const acct2Auth2 = await soap.getAccountAuthToken(account2Name);
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${contactId}">
					<a n="email">${newEmail}</a>
				</cn>
			</ModifyContactRequest>`, acct2Auth2
		);
		assert.notExists(modRes.Fault, 'ModifyContactRequest should not fault');
		assert.exists(modRes.ModifyContactResponse?.cn, 'ModifyContactResponse should contain cn');

		// Incremental backup
		const incrBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackup.Fault, 'Incremental BackupRequest should not fault');
		assert.exists(incrBackup.BackupResponse, 'Incremental BackupResponse should exist');

		// Delete the account
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore the account
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account2Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		// Re-authenticate after restore
		const acct2AuthNew = await soap.getAccountAuthToken(account2Name);

		// Verify the restored contact has the modified email
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, acct2AuthNew
		);
		assert.notExists(getRes.Fault, 'GetContactsRequest should not fault');
		assert.exists(getRes.GetContactsResponse, 'GetContactsResponse should exist');
		const resCn = Array.isArray(getRes.GetContactsResponse?.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse?.cn;
		assert.exists(resCn, 'Restored contact should exist');
		const attrs = Array.isArray(resCn.a) ? resCn.a : [resCn.a];
		const emailAttr = attrs.find(a => a?.n === 'email');
		assert.exists(emailAttr, 'Email attribute should exist');
		assert.equal(emailAttr?._content || emailAttr?._, newEmail, 'Email should match modified value');
	});
});
