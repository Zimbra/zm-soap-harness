import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Bug ZCS-542', function () {
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

		// Send a message to account1 so there is mail in inbox
		const account2Name = `ewstest2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account2AuthToken = await soap.getAccountAuthToken(account2Name, config.accountPassword);
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>email04A</su>
					<mp ct="text/html">
						<content>Bug ZCS-542 test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		await soap.waitFor(5000);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Execute GetItemForMsg With and without request for element MimeContent', async () => {
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
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;

		// Verify response
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === 'email04A');
		assert.exists(matchedItem, "Should find message matching subject");
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Body.$.BodyType, 'HTML',
			'Body type should be HTML');
		const getItemMimeRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>true</t:IncludeMimeContent>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemMimeBody = ews.getBody(getItemMimeRes);
		const getItemMimeMsg = getItemMimeBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const mimeItemMsg = Array.isArray(getItemMimeMsg) ? getItemMimeMsg[0] : getItemMimeMsg;
		assert.equal(mimeItemMsg.$.ResponseClass, 'Success',
			'GetItem with MimeContent should succeed');
		assert.exists(mimeItemMsg.Items.Message.MimeContent,
			'MimeContent should be present when IncludeMimeContent is true');
		const getItemNoMimeRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemNoMimeBody = ews.getBody(getItemNoMimeRes);
		const getItemNoMimeMsg = getItemNoMimeBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const noMimeItemMsg = Array.isArray(getItemNoMimeMsg)
			? getItemNoMimeMsg[0] : getItemNoMimeMsg;
		assert.equal(noMimeItemMsg.$.ResponseClass, 'Success',
			'GetItem without MimeContent should succeed');
		assert.equal(noMimeItemMsg.Items.Message.ItemId.$.Id, mailItemId,
			'ItemId should match');
		const getItemDefaultRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemDefaultBody = ews.getBody(getItemDefaultRes);
		const getItemDefaultMsg = getItemDefaultBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const defaultItemMsg = Array.isArray(getItemDefaultMsg)
			? getItemDefaultMsg[0] : getItemDefaultMsg;
		assert.equal(defaultItemMsg.$.ResponseClass, 'Success',
			'GetItem default should succeed');
		assert.equal(defaultItemMsg.Items.Message.ItemId.$.Id, mailItemId,
			'ItemId should match');
	});
});
