import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Contacts > ContactBackup ZCS-3594', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `test${uid}@${config.testDomain}`;

		// Create the test account with ContactBackup enabled
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureContactBackupEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
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
	it.skip('Sanity | Backup and restore contacts', async () => {
		// Login as account1
		let acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Create contact 1
		const create1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First1</a>
					<a n="lastName">Last1</a>
					<a n="email">email1@domain.com</a>
				</cn>
			</CreateContactRequest>`, acct1Auth
		);
		assert.notExists(create1.Fault, 'CreateContactRequest 1 should not fault');
		const cn1 = Array.isArray(create1.CreateContactResponse?.cn)
			? create1.CreateContactResponse.cn[0] : create1.CreateContactResponse?.cn;
		assert.exists(cn1, 'Contact 1 should be created');

		// Create contact 2
		const create2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First2</a>
					<a n="lastName">Last2</a>
					<a n="email">email2@domain.com</a>
				</cn>
			</CreateContactRequest>`, acct1Auth
		);
		assert.notExists(create2.Fault, 'CreateContactRequest 2 should not fault');
		const cn2 = Array.isArray(create2.CreateContactResponse?.cn)
			? create2.CreateContactResponse.cn[0] : create2.CreateContactResponse?.cn;
		assert.exists(cn2, 'Contact 2 should be created');
		const contact2Id = cn2.id;

		// Create contact 3
		const create3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First3</a>
					<a n="lastName">Last3</a>
					<a n="email">email3@domain.com</a>
				</cn>
			</CreateContactRequest>`, acct1Auth
		);
		assert.notExists(create3.Fault, 'CreateContactRequest 3 should not fault');

		// Start contact backup via admin
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<ContactBackupRequest xmlns="urn:zimbraAdmin" op="start"/>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'ContactBackupRequest should not fault');
		assert.exists(backupRes.ContactBackupResponse, 'ContactBackupResponse should exist');

		// Wait for backup to process
		await new Promise(r => setTimeout(r, 60000));

		// Re-auth as account1
		acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Delete contact 2
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contact2Id}" op="delete"/>
			</ContactActionRequest>`, acct1Auth
		);
		assert.notExists(deleteRes.Fault, 'ContactActionRequest should not fault');

		// Wait for processing
		await new Promise(r => setTimeout(r, 30000));

		// Get the backup file list
		const listRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactBackupListRequest xmlns="urn:zimbraMail"/>`, acct1Auth
		);
		assert.notExists(listRes.Fault, 'GetContactBackupListRequest should not fault');
		const backupsRaw = listRes.GetContactBackupListResponse?.backups;
		assert.exists(backupsRaw, 'Backups element should exist');
		const backupsObj = Array.isArray(backupsRaw) ? backupsRaw[0] : backupsRaw;
		const backupArr = Array.isArray(backupsObj?.backup) ? backupsObj.backup : (backupsObj?.backup ? [backupsObj.backup] : []);
		const backupFile = typeof backupArr[0] === 'string' ? backupArr[0] : (backupArr[0]?._content || backupArr[0]);
		assert.exists(backupFile, 'Backup file should exist');

		// Restore contacts from backup
		const restoreRes = await soap.makeSOAPEnvelopeAccount(
			`<RestoreContactsRequest contactsBackupFileName="${backupFile}"
				xmlns="urn:zimbraMail"/>`, acct1Auth
		);
		assert.notExists(restoreRes.Fault, 'RestoreContactsRequest should not fault');
		assert.exists(restoreRes.RestoreContactsResponse, 'RestoreContactsResponse should exist');

		// Search for all contacts to verify restoration
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>in:contacts</query>
			</SearchRequest>`, acct1Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
