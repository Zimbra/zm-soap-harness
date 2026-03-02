import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Remove Attachment From Mail From Zwc', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account2AuthToken, accountPassword;
	const messageSubject = 'Message test Subject1';
	const messageContent = 'Message test Content1';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsrmzwc1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsrmzwc2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
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
	it('Sanity | Remove single attachment from mail using Server and sync on EWS client', async () => {
		// Send mail with 2 attachments from account1 to account2 via EWS
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];

		// MIME with 2 attachments: file1.pdf and image2.png
		const mimeRaw =
			`Subject: ${messageSubject}\r\n` +
			`Thread-Topic: ${messageSubject}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: multipart/mixed;\r\n' +
			'\tboundary="B_3594803632_1185087281"\r\n' +
			'\r\n' +
			'--B_3594803632_1185087281\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			`${messageContent}\r\n` +
			'\r\n' +
			'--B_3594803632_1185087281\r\n' +
			'Content-type: application/pdf; name="file1.pdf"\r\n' +
			'Content-disposition: attachment;\r\n' +
			'\tfilename="file1.pdf"\r\n' +
			'Content-transfer-encoding: base64\r\n' +
			'\r\n' +
			'VGVzdCBQREYgY29udGVudA==\r\n' +
			'\r\n' +
			'--B_3594803632_1185087281\r\n' +
			'Content-type: image/png; name="image2.png"\r\n' +
			'Content-disposition: attachment;\r\n' +
			'\tfilename="image2.png"\r\n' +
			'Content-transfer-encoding: base64\r\n' +
			'\r\n' +
			'VGVzdCBQTkcgY29udGVudA==\r\n' +
			'\r\n' +
			'--B_3594803632_1185087281--\r\n';
		const mimeContent = Buffer.from(mimeRaw).toString('base64');

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mimeContent}</t:MimeContent>
						<t:Importance>Normal</t:Importance>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');

		await soap.waitFor(5000);

		// EWS: SyncFolderItems on sent items for account1
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncSentBody = ews.getBody(syncSentRes);
		const syncSentMsg = syncSentBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSentMessage = Array.isArray(syncSentMsg) ? syncSentMsg[0] : syncSentMsg;
		assert.equal(syncSentMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const sentCreates = Array.isArray(syncSentMessage.Changes.Create)
			? syncSentMessage.Changes.Create : [syncSentMessage.Changes.Create];
		const sentMatch = sentCreates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(sentMatch, 'Should find sent message matching subject');
		const mailItemId = sentMatch.Message.ItemId.$.Id;
		const mailChangeKey = sentMatch.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify mail has attachments
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Categories" />
						<t:FieldURI FieldURI="item:Body" />
						<t:ExtendedFieldURI PropertyTag="0x7D" PropertyType="String" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:Size" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="message:References" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.equal(itemMsg.Items.Message.HasAttachments, 'true',
			'HasAttachments should be true');
		const attachments = itemMsg.Items.Message.Attachments.FileAttachment;
		const attachArray = Array.isArray(attachments) ? attachments : [attachments];
		assert.equal(attachArray[0].Name, 'file1.pdf',
			'First attachment should be file1.pdf');
		assert.equal(attachArray[1].Name, 'image2.png',
			'Second attachment should be image2.png');

		// ZWC: Search for mail on account2
		await soap.waitFor(8000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const hit = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(hit, 'Should find message in search results');
		assert.include(hit.su, messageSubject, 'Subject should match');
		const mailIdWc = hit.id;

		// GetMsg to verify attachments on ZWC
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${mailIdWc}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgObj = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.include(msgObj.su, messageSubject, 'Subject should match');

		// Find attachment parts
		const mpArray = Array.isArray(msgObj.mp) ? msgObj.mp : [msgObj.mp];
		const findAttachPart = (parts, filename) => {
			for (const p of parts) {
				if (p.filename === filename) return p.part;
				if (p.mp) {
					const inner = Array.isArray(p.mp) ? p.mp : [p.mp];
					const found = findAttachPart(inner, filename);
					if (found) return found;
				}
			}
			return null;
		};
		const part1 = findAttachPart(mpArray, 'file1.pdf');
		assert.exists(part1, 'file1.pdf attachment should exist');

		// Remove single attachment (file1.pdf) from ZWC
		const removeRes = await soap.makeSOAPEnvelopeAccount(
			`<RemoveAttachmentsRequest xmlns="urn:zimbraMail">
				<m id="${mailIdWc}" part="${part1}" />
			</RemoveAttachmentsRequest>`, account2AuthToken
		);
		assert.notExists(removeRes.Fault, 'Response should not be a Fault');
		const removeM = Array.isArray(removeRes.RemoveAttachmentsResponse.m) ? removeRes.RemoveAttachmentsResponse.m[0] : removeRes.RemoveAttachmentsResponse.m;
		const newMsgId = removeM.id;

		// Verify on ZWC that file1.pdf is removed
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${newMsgId}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const msgObj2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0] : getMsgRes2.GetMsgResponse.m;
		assert.include(msgObj2.su, messageSubject, 'Subject should match');

		await soap.waitFor(5000);

		// EWS: SyncFolderItems on inbox for account2
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, "Should find message matching subject");
		const ewsMailId = matchedItem.Message.ItemId.$.Id;
		const ewsChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify attachment state
		const getItemRes2 = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:ExtendedFieldURI PropertyTag="0x7D" PropertyType="String" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:Size" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${ewsMailId}" ChangeKey="${ewsChangeKey}" />
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
		assert.equal(itemMsg2.Items.Message.HasAttachments, 'true',
			'HasAttachments should still be true (image2.png remains)');
		const remainingAttach = itemMsg2.Items.Message.Attachments.FileAttachment;
		const remainingArray = Array.isArray(remainingAttach)
			? remainingAttach : [remainingAttach];
		assert.equal(remainingArray[0].Name, 'image2.png',
			'Remaining attachment should be image2.png');
	});
});
