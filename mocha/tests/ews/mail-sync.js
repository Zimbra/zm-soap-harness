import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Mail Sync', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Password;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		const accountName = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		account1Password = config.accountPassword;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not be a Fault');
		account1Email = accountName;

		// Send 2 messages to self via Zimbra SOAP
		const accountAuthToken = await soap.getAccountAuthToken(account1Email, account1Password);
		const subject1 = `subject${common.getUniqueString()}`;
		const subject2 = `subject${common.getUniqueString()}`;
		const content1 = 'Message 1 test content';
		const content2 = 'Message 2 test content';

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${subject1}</su>
					<mp ct="text/plain">
						<content>${content1}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>${content2}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);

		await soap.waitFor(5000);

		// Verify messages in inbox
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
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
	it('Sanity | Execute GetFolder request for inbox, perform initial sync and then delta sync', async () => {
		// Step 1: GetFolder for inbox
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account1Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email, account1Password
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const folderId = folderMsg.Folders.Folder.FolderId.$.Id;
		assert.equal(folderId, '2', 'Inbox folder Id should be 2');

		// Step 2: Initial SyncFolderItems
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.exists(syncMessage.SyncState, 'SyncState should exist');
		const syncState = syncMessage.SyncState;

		const changes = syncMessage.Changes;
		const creates = Array.isArray(changes.Create) ? changes.Create : [changes.Create];
		assert.isAbove(creates.length, 0, 'Should have created items');
		const item1 = creates[0].Message.ItemId;
		assert.exists(item1.$.Id, 'First item should have Id');
		assert.exists(item1.$.ChangeKey, 'First item should have ChangeKey');

		// Step 3: GetItem for synced messages
		const itemIds = creates.map(c => c.Message.ItemId.$);
		const itemIdsXml = itemIds.map(
			i => `<t:ItemId Id="${i.Id}" ChangeKey="${i.ChangeKey}" />`
		).join('\n');

		const getItemRes = await ews.makeEWSRequest(
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
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					${itemIdsXml}
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);

		// Step 4: Send another mail and perform delta sync
		const accountAuthToken = await soap.getAccountAuthToken(account1Email, account1Password);
		const subject3 = `subject${common.getUniqueString()}`;
		const content3 = 'Message 3 test content';
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${subject3}</su>
					<mp ct="text/plain">
						<content>${content3}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);

		await common.delay(8000);

		// Delta sync with previous SyncState
		const deltaSyncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const deltaSyncBody = ews.getBody(deltaSyncRes);
		const deltaSyncMsg = deltaSyncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const deltaMsg = Array.isArray(deltaSyncMsg) ? deltaSyncMsg[0] : deltaSyncMsg;
		assert.exists(deltaMsg.SyncState, 'Delta SyncState should exist');
		const deltaChanges = deltaMsg.Changes;
		assert.exists(deltaChanges.Create, 'Delta sync should have new Create items');
		const deltaCreates = Array.isArray(deltaChanges.Create)
			? deltaChanges.Create : [deltaChanges.Create];
		const newItemId = deltaCreates[0].Message.ItemId.$.Id;

		// GetItem for the new delta-synced message
		const getNewItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${newItemId}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getNewItemBody = ews.getBody(getNewItemRes);
		const getItemMsg = getNewItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const newItemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(newItemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const msgBody = newItemMsg.Items.Message.Body._;
		assert.include(msgBody, content3, 'Message body should contain expected content');

		// Step 5: Mark message as read on ZWC and verify delta sync shows update
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${newItemId}" op="read" />
			</MsgActionRequest>`, accountAuthToken
		);

		const readSyncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState>${deltaMsg.SyncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const readSyncBody = ews.getBody(readSyncRes);
		const readSyncMsg = readSyncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const readMsg = Array.isArray(readSyncMsg) ? readSyncMsg[0] : readSyncMsg;
		assert.exists(readMsg.Changes.Update, 'Should have Update changes after read');
		const updates = Array.isArray(readMsg.Changes.Update)
			? readMsg.Changes.Update : [readMsg.Changes.Update];
		const updatedItem = updates[0].Message;
		assert.equal(updatedItem.ItemId.$.Id, newItemId, 'Updated item should be the read message');
		assert.equal(updatedItem.IsRead, 'true', 'IsRead should be true after marking read');
	});
});
