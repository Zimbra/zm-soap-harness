import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import ews from '../../../../framework/backend/ews.js';
import { main } from '../../../../pages/main.js';

const IMAGE_CONTENT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const IMAGE_CONTENT_ID = 'image001.png@01DBD4E3.AB0FB680';
const IMAGE_CONTENT_ID2 = 'image002.png@01DBE6D1.296FAEA0';

describe('EWS > Calendar > Inline > Meeting Send Update And Accept With Inline Attachment', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, account2Email, accountPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = config.accountPassword;
		account1Email = `test1.${unique}@${config.testDomain}`;
		account2Email = `test2.${unique}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | After create meeting update same meeting and send meeting with inline image from EWS and sync on ZWC client and accept', async () => {
		const unique = common.getUniqueString();
		const apptSubject1 = `subject1.${unique}`;
		const apptSubject2 = `subject_updated.${unique}`;
		const startTime = common.getXMLTime(60);
		const endTime = common.getXMLTime(120);
		const htmlBody = `&lt;html&gt;&lt;body&gt;&lt;p&gt;&lt;img src="cid:${IMAGE_CONTENT_ID}"&gt;&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;`;

		// Step 1: Create appointment from EWS
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly"
				SendMeetingInvitations="SendToNone">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${apptSubject1}</t:Subject>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">${htmlBody}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>${startTime}</t:Start>
						<t:End>${endTime}</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		assert.equal(createMsg.$.ResponseClass, 'Success', 'CreateItem should succeed');
		const calItemId = createMsg.Items.CalendarItem.ItemId.$.Id;

		// Step 2: Attach first inline image
		const attachRes = await ews.makeEWSRequest(
			`<CreateAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentItemId Id="${calItemId}" />
				<Attachments>
					<t:FileAttachment>
						<t:Name>image001.png</t:Name>
						<t:ContentType>image/png</t:ContentType>
						<t:ContentId>${IMAGE_CONTENT_ID}</t:ContentId>
						<t:IsContactPhoto>false</t:IsContactPhoto>
						<t:Content>${IMAGE_CONTENT}</t:Content>
					</t:FileAttachment>
				</Attachments>
			</CreateAttachment>`,
			account1Email, accountPassword
		);
		const attachBody = ews.getBody(attachRes);
		const attachMsg = attachBody.CreateAttachmentResponse
			.ResponseMessages.CreateAttachmentResponseMessage;
		assert.equal(attachMsg.$.ResponseClass, 'Success', 'CreateAttachment should succeed');
		const attachCk = attachMsg.Attachments.FileAttachment.AttachmentId.$.RootItemChangeKey;

		// Step 3: First UpdateItem to send meeting
		await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${calItemId}" ChangeKey="${attachCk}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${apptSubject1}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, accountPassword
		);

		// Step 4: Attach second inline image and update subject
		const attachRes2 = await ews.makeEWSRequest(
			`<CreateAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentItemId Id="${calItemId}" />
				<Attachments>
					<t:FileAttachment>
						<t:Name>image001.png</t:Name>
						<t:ContentType>image/png</t:ContentType>
						<t:ContentId>${IMAGE_CONTENT_ID}</t:ContentId>
						<t:IsContactPhoto>false</t:IsContactPhoto>
						<t:Content>${IMAGE_CONTENT}</t:Content>
					</t:FileAttachment>
					<t:FileAttachment>
						<t:Name>image002.png</t:Name>
						<t:ContentType>image/png</t:ContentType>
						<t:ContentId>${IMAGE_CONTENT_ID2}</t:ContentId>
						<t:IsContactPhoto>false</t:IsContactPhoto>
						<t:Content>${IMAGE_CONTENT}</t:Content>
					</t:FileAttachment>
				</Attachments>
			</CreateAttachment>`,
			account1Email, accountPassword
		);
		const attachBody2 = ews.getBody(attachRes2);
		const attachMsg2 = attachBody2.CreateAttachmentResponse
			.ResponseMessages.CreateAttachmentResponseMessage;
		const attachMsgArr = Array.isArray(attachMsg2) ? attachMsg2 : [attachMsg2];
		const attachCk2 = attachMsgArr[0].Attachments.FileAttachment.AttachmentId.$.RootItemChangeKey;

		// Step 5: Second UpdateItem with updated subject and send
		await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${calItemId}" ChangeKey="${attachCk2}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${apptSubject2}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, accountPassword
		);

		// Step 6: Sync and verify
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>100</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');

		// Verify on organizer ZWC
		const acct1Token = await soap.getAccountAuthToken(account1Email, accountPassword);
		const sentSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"Sent" subject:${apptSubject2}</query>
			</SearchRequest>`, acct1Token
		);
		assert.notExists(sentSearch.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sentSearch.SearchResponse.m)
			? sentSearch.SearchResponse.m[0] : sentSearch.SearchResponse.m;
		assert.exists(sentMsg, 'Sent message with updated subject should exist');

		// Verify on attendee ZWC
		const acct2Token = await soap.getAccountAuthToken(account2Email, accountPassword);
		const inboxSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"Inbox" subject:${apptSubject2}</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(inboxSearch.Fault, 'Response should not be a Fault');
		const inboxMsg = Array.isArray(inboxSearch.SearchResponse.m)
			? inboxSearch.SearchResponse.m[0] : inboxSearch.SearchResponse.m;
		assert.exists(inboxMsg, 'Updated meeting should be received by attendee');

		// Attendee accepts
		const apptSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject2}</query>
			</SearchRequest>`, acct2Token
		);
		assert.notExists(apptSearch.Fault, 'Response should not be a Fault');
		const attendeeAppt = Array.isArray(apptSearch.SearchResponse.appt)
			? apptSearch.SearchResponse.appt[0] : apptSearch.SearchResponse.appt;
		const attendeeInvId = attendeeAppt.invId;

		const acceptRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				verb="ACCEPT" id="${attendeeInvId}" compNum="0" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${account1Email}" />
					<e t="f" a="${account2Email}" />
					<su>Accept: ${apptSubject2}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>Yes, I will attend.</content>
						</mp>
						<mp ct="text/html">
							<content>&lt;html&gt;&lt;body&gt;Yes, I will attend.&lt;/body&gt;&lt;/html&gt;</content>
						</mp>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct2Token
		);
		assert.notExists(acceptRes.Fault, 'SendInviteReply should not fault');
		assert.exists(acceptRes.SendInviteReplyResponse, 'SendInviteReplyResponse should exist');

		// Verify organizer received the accept
		const acct1Token2 = await soap.getAccountAuthToken(account1Email, accountPassword);
		const responseSearch = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:"Inbox" from:${account2Email} subject:"${apptSubject2}"</query>
			</SearchRequest>`, acct1Token2
		);
		assert.notExists(responseSearch.Fault, 'Response should not be a Fault');
		const responseMsg = Array.isArray(responseSearch.SearchResponse.m)
			? responseSearch.SearchResponse.m[0] : responseSearch.SearchResponse.m;
		assert.exists(responseMsg, 'Accept response should be received by organizer');
	});
});
