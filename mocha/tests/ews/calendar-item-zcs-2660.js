import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > CalendarItem ZCS-2660', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Password;
	let account2Email, account2Password;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;
		account2Password = config.accountPassword;

		const account1Name = `ewstest1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Email = account1Name;

		const account2Name = `ewstest2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${account2Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Email = account2Name;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Declining a forwarded meeting from EWS client should not post html tags in organisers ZWC', async () => {
		const appointmentSubject = `appsubject1${common.getUniqueString()}`;
		const appointmentContent = `appcont1${common.getUniqueString()}`;

		// ZWC: User2 creates an all-day appointment and invites user1
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="1"
							name="${appointmentSubject}">
							<or a="${account2Email}" />
							<at a="${account1Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="20190101" />
							<e d="20190101" />
						</comp>
					</inv>
					<e a="${account1Email}" t="t" />
					<su>${appointmentSubject}</su>
					<mp ct="text/plain">
						<content>${appointmentContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account2AuthToken
		);
		assert.notExists(createApptRes.Fault, 'CreateAppointmentRequest should not be a Fault');

		await soap.waitFor(5000);

		// EWS: User1 gets calendar folder
		const getFolderRes = await ews.makeEWSRequest(
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
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.CalendarFolder.FolderId.$.Id, '10',
			'Calendar folder Id should be 10');

		// EWS: SyncFolderItems for calendar
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="calendar" />
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
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const calItemId = calItem.CalendarItem ? calItem.CalendarItem.ItemId.$.Id : calItem.MeetingRequest.ItemId.$.Id;
		const calChangeKey = calItem.CalendarItem ? calItem.CalendarItem.ItemId.$.ChangeKey : calItem.MeetingRequest.ItemId.$.ChangeKey;

		// EWS: GetItem for the calendar item
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="calendar:CalendarItemType" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="calendar:AppointmentSequenceNumber" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${calItemId}" ChangeKey="${calChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, account1Password
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const getItemId = itemMsg.Items.CalendarItem.ItemId.$.Id;
		const getItemCk = itemMsg.Items.CalendarItem.ItemId.$.ChangeKey;

		// EWS: User1 forwards the meeting to admin
		const fwRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy" SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:ForwardItem>
						<t:Subject>FW: ${appointmentSubject}</t:Subject>
						<t:Body BodyType="HTML">${appointmentContent}</t:Body>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${config.adminUser}</t:Name>
								<t:EmailAddress>${config.adminUser}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:ReferenceItemId Id="${getItemId}" ChangeKey="${getItemCk}" />
					</t:ForwardItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const fwBody = ews.getBody(fwRes);
		const fwMsg = fwBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const fwMessage = Array.isArray(fwMsg) ? fwMsg[0] : fwMsg;
		assert.equal(fwMessage.$.ResponseClass, 'Success', 'ForwardItem should succeed');

		// EWS: User1 declines the meeting
		const declineRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy" SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:DeclineItem>
						<t:ReferenceItemId Id="${getItemId}" />
					</t:DeclineItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const declineBody = ews.getBody(declineRes);
		const declineMsg = declineBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const declineMessage = Array.isArray(declineMsg) ? declineMsg[0] : declineMsg;
		assert.equal(declineMessage.$.ResponseClass, 'Success', 'DeclineItem should succeed');

		// ZWC: User2 checks inbox for decline mail — should not have HTML tags
		await soap.waitFor(10000);
		const account2AuthToken2 = await soap.getAccountAuthToken(account2Email, account2Password);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox from:${account1Email}</query>
			</SearchRequest>`, account2AuthToken2
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');

		// Find decline message
		const conversations = searchRes.SearchResponse?.c;
		assert.exists(conversations, 'Conversations should exist');
		const convList = Array.isArray(conversations) ? conversations : [conversations];
		let declineMsgId = null;
		for (const conv of convList) {
			const msgs = Array.isArray(conv.m) ? conv.m : [conv.m];
			for (const m of msgs) {
				if (conv.su && conv.su.includes('Decline')) {
					declineMsgId = m.id;
					break;
				}
			}
			if (declineMsgId) break;
		}

		if (declineMsgId) {
			const getMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${declineMsgId}" />
				</GetMsgRequest>`, account2AuthToken2
			);
			assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
			assert.exists(getMsgRes.GetMsgResponse?.m, 'Message should exist');
		}
	});
});
