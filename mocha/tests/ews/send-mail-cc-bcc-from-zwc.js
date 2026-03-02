import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Send Mail Cc Bcc From Zwc', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, account4Email, accountPassword;
	let messageSubject;
	const messageContent = 'Message test content';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		messageSubject = `subject${common.getUniqueString()}`;

		account1Email = `ewsccbccz1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsccbccz2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsccbccz3${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account4Email = `ewsccbccz4${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
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
	it('Sanity | Send an email from user1 To user2 with CC user3 and BCC use4 from ZWC to EWS', async () => {
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		// Send the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<e t="c" a="${account3Email}" />
					<e t="b" a="${account4Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		await soap.waitFor(5000);
		const getFolderRes2 = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, accountPassword
		);
		const getFolderBody2 = ews.getBody(getFolderRes2);
		const getFolderMsg2 = getFolderBody2.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg2 = Array.isArray(getFolderMsg2) ? getFolderMsg2[0] : getFolderMsg2;
		assert.equal(folderMsg2.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const inboxId2 = folderMsg2.Folders.Folder.FolderId.$.Id;

		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId2}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates2 = Array.isArray(syncMessage2.Changes.Create)
			? syncMessage2.Changes.Create : [syncMessage2.Changes.Create];
		const mailId2 = creates2[0].Message.ItemId.$.Id;
		const mailChangeKey2 = creates2[0].Message.ItemId.$.ChangeKey;
		const getItemRes2 = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="message:ToRecipients" />
						<t:FieldURI FieldURI="message:CcRecipients" />
						<t:FieldURI FieldURI="message:BccRecipients" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId2}" ChangeKey="${mailChangeKey2}" />
				</ItemIds>
			</GetItem>`,
			account2Email, accountPassword
		);
		const getItemBody2 = ews.getBody(getItemRes2);
		const getItemMsg2 = getItemBody2.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg2 = Array.isArray(getItemMsg2) ? getItemMsg2[0] : getItemMsg2;
		assert.equal(itemMsg2.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg2.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.include(itemMsg2.Items.Message.Body._, messageContent,
			'Body should contain content');
		const toRecips2 = Array.isArray(itemMsg2.Items.Message.ToRecipients?.Mailbox)
			? itemMsg2.Items.Message.ToRecipients.Mailbox
			: [itemMsg2.Items.Message.ToRecipients?.Mailbox];
		assert.equal(toRecips2[0].EmailAddress, account2Email,
			'ToRecipient should be account2');
		const ccRecips2 = Array.isArray(itemMsg2.Items.Message.CcRecipients?.Mailbox)
			? itemMsg2.Items.Message.CcRecipients.Mailbox
			: [itemMsg2.Items.Message.CcRecipients?.Mailbox];
		assert.equal(ccRecips2[0].EmailAddress, account3Email,
			'CcRecipient should be account3');
		const toEmails2 = toRecips2.map(r => r.EmailAddress);
		assert.notInclude(toEmails2, account4Email,
			'Account4 should not be in To');
		const ccEmails2 = ccRecips2.map(r => r.EmailAddress);
		assert.notInclude(ccEmails2, account4Email,
			'Account4 should not be in Cc');
		assert.notExists(itemMsg2.Items.Message.BccRecipients,
			'BccRecipients should not be visible');
		const getFolderRes3 = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account3Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account3Email, accountPassword
		);
		const getFolderBody3 = ews.getBody(getFolderRes3);
		const getFolderMsg3 = getFolderBody3.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg3 = Array.isArray(getFolderMsg3) ? getFolderMsg3[0] : getFolderMsg3;
		assert.equal(folderMsg3.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const inboxId3 = folderMsg3.Folders.Folder.FolderId.$.Id;

		const syncRes3 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId3}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account3Email, accountPassword
		);
		const syncBody3 = ews.getBody(syncRes3);
		const syncMsg3 = syncBody3.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage3 = Array.isArray(syncMsg3) ? syncMsg3[0] : syncMsg3;
		assert.equal(syncMessage3.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates3 = Array.isArray(syncMessage3.Changes.Create)
			? syncMessage3.Changes.Create : [syncMessage3.Changes.Create];
		const mailId3 = creates3[0].Message.ItemId.$.Id;
		const mailChangeKey3 = creates3[0].Message.ItemId.$.ChangeKey;
		const getItemRes3 = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="message:ToRecipients" />
						<t:FieldURI FieldURI="message:CcRecipients" />
						<t:FieldURI FieldURI="message:BccRecipients" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId3}" ChangeKey="${mailChangeKey3}" />
				</ItemIds>
			</GetItem>`,
			account3Email, accountPassword
		);
		const getItemBody3 = ews.getBody(getItemRes3);
		const getItemMsg3 = getItemBody3.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg3 = Array.isArray(getItemMsg3) ? getItemMsg3[0] : getItemMsg3;
		assert.equal(itemMsg3.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg3.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.include(itemMsg3.Items.Message.Body._, messageContent,
			'Body should contain content');
		const toRecips3 = Array.isArray(itemMsg3.Items.Message.ToRecipients?.Mailbox)
			? itemMsg3.Items.Message.ToRecipients.Mailbox
			: [itemMsg3.Items.Message.ToRecipients?.Mailbox];
		assert.equal(toRecips3[0].EmailAddress, account2Email,
			'ToRecipient should be account2');
		const ccRecips3 = Array.isArray(itemMsg3.Items.Message.CcRecipients?.Mailbox)
			? itemMsg3.Items.Message.CcRecipients.Mailbox
			: [itemMsg3.Items.Message.CcRecipients?.Mailbox];
		assert.equal(ccRecips3[0].EmailAddress, account3Email,
			'CcRecipient should be account3');
		const toEmails3 = toRecips3.map(r => r.EmailAddress);
		assert.notInclude(toEmails3, account4Email,
			'Account4 should not be in To');
		const ccEmails3 = ccRecips3.map(r => r.EmailAddress);
		assert.notInclude(ccEmails3, account4Email,
			'Account4 should not be in Cc');
		assert.notExists(itemMsg3.Items.Message.BccRecipients,
			'BccRecipients should not be visible');
	});
});
