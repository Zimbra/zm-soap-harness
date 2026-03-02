import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Get Folder ZCS 1433', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Password;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;

		const accountName = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Email = accountName;
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
	it('Sanity | Get Folder request for Calendar folder with base shape as All Properties', async () => {
		const res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="calendar">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(res);
		const msg = body.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;

		// Verify response
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.CalendarFolder.FolderId.$.Id, '10',
			'Calendar folder Id should be 10');
		assert.equal(folderMsg.Folders.CalendarFolder.DisplayName, 'Calendar',
			'DisplayName should be Calendar');
	});


	it('Sanity | Get Folder request for Contact folder with base shape as All Properties', async () => {
		const res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="contacts">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(res);
		const msg = body.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;

		// Verify response
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.ContactsFolder.FolderId.$.Id, '7',
			'Contacts folder Id should be 7');
		assert.equal(folderMsg.Folders.ContactsFolder.DisplayName, 'Contacts',
			'DisplayName should be Contacts');
	});


	it('Sanity | Get Folder request for Calendar folder with base shape as Default', async () => {
		const res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>Default</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="calendar">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(res);
		const msg = body.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;

		// Verify response
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.CalendarFolder.FolderId.$.Id, '10',
			'Calendar folder Id should be 10');
		assert.equal(folderMsg.Folders.CalendarFolder.DisplayName, 'Calendar',
			'DisplayName should be Calendar');
	});


	it('Sanity | Get Folder request for Contact folder with base shape as Default', async () => {
		const res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>Default</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="contacts">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(res);
		const msg = body.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;

		// Verify response
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.ContactsFolder.FolderId.$.Id, '7',
			'Contacts folder Id should be 7');
		assert.equal(folderMsg.Folders.ContactsFolder.DisplayName, 'Contacts',
			'DisplayName should be Contacts');
	});


	it('Sanity | Get Folder request for Contact and Calendar folder with base shape as IdOnly', async () => {
		const res = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="contacts">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
					<t:DistinguishedFolderId Id="calendar">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(res);
		const msgs = body.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const msgArray = Array.isArray(msgs) ? msgs : [msgs];

		// Verify response
		assert.isAtLeast(msgArray.length, 2, 'Should have 2 response messages');
		assert.equal(msgArray[0].$.ResponseClass, 'Success',
			'First GetFolder should succeed');
		assert.equal(msgArray[0].Folders.ContactsFolder.FolderId.$.Id, '7',
			'First folder Id should be 7 (Contacts)');
		assert.equal(msgArray[1].$.ResponseClass, 'Success',
			'Second GetFolder should succeed');
		assert.equal(msgArray[1].Folders.CalendarFolder.FolderId.$.Id, '10',
			'Second folder Id should be 10 (Calendar)');
	});
});
