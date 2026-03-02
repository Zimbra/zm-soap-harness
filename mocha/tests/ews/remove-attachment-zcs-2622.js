import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Remove Attachment ZCS 2622', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		accountEmail = `ewszcs2622${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
	it('Sanity | Removing a single attachment from Calendar app should be success', async () => {
		const apptSubject = `Subj1${common.getUniqueString()}`;
		const apptLocation = `Location of meeting${common.getUniqueString()}`;
		const apptContent = `Cont${common.getUniqueString()}`;
		const createRes = await ews.makeEWSRequest(
			`<m:CreateItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				SendMeetingInvitations="SendToNone">
				<m:SavedItemFolderId>
					<t:FolderId Id="10" />
				</m:SavedItemFolderId>
				<m:Items>
					<t:CalendarItem>
						<t:Subject>${apptSubject}</t:Subject>
						<t:Body BodyType="Text">${apptContent}</t:Body>
						<t:Start>2025-12-15T13:30:00Z</t:Start>
						<t:End>2025-12-15T14:00:00Z</t:End>
						<t:Location>${apptLocation}</t:Location>
					</t:CalendarItem>
				</m:Items>
			</m:CreateItem>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');
		const calItemId = createMessage.Items.CalendarItem.ItemId.$.Id;
		const calChangeKey = createMessage.Items.CalendarItem.ItemId.$.ChangeKey;
		const createAttachRes = await ews.makeEWSRequest(
			`<m:CreateAttachment xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ParentItemId Id="${calItemId}" ChangeKey="${calChangeKey}" />
				<m:Attachments>
					<t:FileAttachment>
						<t:Name>file1.pdf</t:Name>
						<t:Content>VGVzdCBQREYgY29udGVudA==</t:Content>
					</t:FileAttachment>
					<t:FileAttachment>
						<t:Name>image1.jpg</t:Name>
						<t:Content>VGVzdCBKUEcgY29udGVudA==</t:Content>
					</t:FileAttachment>
					<t:FileAttachment>
						<t:Name>image2.png</t:Name>
						<t:Content>VGVzdCBQTkcgY29udGVudA==</t:Content>
					</t:FileAttachment>
				</m:Attachments>
			</m:CreateAttachment>`,
			accountEmail, accountPassword
		);
		const createAttachBody = ews.getBody(createAttachRes);
		const createAttachMsg = createAttachBody.CreateAttachmentResponse
			.ResponseMessages.CreateAttachmentResponseMessage;
		const attachMsgs = Array.isArray(createAttachMsg)
			? createAttachMsg : [createAttachMsg];
		assert.equal(attachMsgs[0].$.ResponseClass, 'Success',
			'CreateAttachment should succeed');
		const fileAttach = attachMsgs[attachMsgs.length - 1].Attachments.FileAttachment;
		const lastAttach = Array.isArray(fileAttach) ? fileAttach[fileAttach.length - 1] : fileAttach;
		const updatedChangeKey = lastAttach.AttachmentId.$.RootItemChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Attachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${calItemId}" ChangeKey="${updatedChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const attachments = itemMsg.Items.CalendarItem.Attachments.FileAttachment;
		const attachArray = Array.isArray(attachments) ? attachments : [attachments];
		assert.isAtLeast(attachArray.length, 2, 'Should have at least 2 attachments');
		const attach2Id = attachArray[1].AttachmentId.$.Id;
		const deleteAttachRes = await ews.makeEWSRequest(
			`<m:DeleteAttachment xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:AttachmentIds>
					<t:AttachmentId Id="${attach2Id}" />
				</m:AttachmentIds>
			</m:DeleteAttachment>`,
			accountEmail, accountPassword
		);
		const deleteAttachBody = ews.getBody(deleteAttachRes);
		const deleteAttachMsg = deleteAttachBody.DeleteAttachmentResponse
			.ResponseMessages.DeleteAttachmentResponseMessage;
		const deleteMsg = Array.isArray(deleteAttachMsg)
			? deleteAttachMsg[0] : deleteAttachMsg;
		assert.equal(deleteMsg.$.ResponseClass, 'Success',
			'DeleteAttachment should succeed');
		assert.equal(deleteMsg.ResponseCode, 'NoError',
			'ResponseCode should be NoError');
	});
});
