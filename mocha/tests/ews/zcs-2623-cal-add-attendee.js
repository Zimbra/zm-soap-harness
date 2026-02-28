import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > ZCS-2623 Calendar Add Attendee', function () {
	this.timeout(180 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;
	let apptSubject;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		apptSubject = `Subject of meeting${common.getUniqueString()}`;

		account1Email = `ewszcs2623a${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewszcs2623b${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewszcs2623c${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
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
	it('Sanity | Verify attendee is added from calendar app', async () => {
		const apptContent = `Content of the message${common.getUniqueString()}`;
		const account2Username = account2Email.split('@')[0];
		const account3Username = account3Email.split('@')[0];

		// Create appointment from ZWC user1 inviting user2
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="20180101T120000" tz="America/Los_Angeles" />
							<e d="20180101T130000" tz="America/Los_Angeles" />
						</comp>
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse,
			'CreateAppointmentResponse should exist');

		await soap.waitFor(10000);

		// User2 accepts the meeting
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt[0] : searchRes2.SearchResponse.appt;
		const invId2 = appt2.invId;
		const compNum2 = appt2.compNum || '0';
		const organizer2 = Array.isArray(appt2.or) ? appt2.or[0].a : appt2.or.a;

		const acceptRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invId2}" compNum="${compNum2}" verb="ACCEPT" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer2}" />
					<su>Accept: ${apptSubject}</su>
					<mp ct="text/plain">
						<content>Accept: ${apptSubject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, account2AuthToken
		);
		assert.notExists(acceptRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(10000);

		// EWS: SyncFolderItems on calendar folder
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
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
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const rawCreates = syncMessage.Changes?.Create;
		const creates = rawCreates ? (Array.isArray(rawCreates) ? rawCreates : [rawCreates]) : [];
		const rawUpdates = syncMessage.Changes?.Update;
		const updates = rawUpdates ? (Array.isArray(rawUpdates) ? rawUpdates : [rawUpdates]) : [];
		const allSyncItems = [...creates, ...updates];
		const calMatch = allSyncItems.find(c => c?.CalendarItem?.Subject === apptSubject
			|| c?.MeetingRequest?.Subject === apptSubject
			|| c?.CalendarItem || c?.MeetingRequest);
		const calItem = calMatch?.CalendarItem || calMatch?.MeetingRequest;
		assert.exists(calItem, 'Calendar item should be found in sync results');
		const cal01Id = calItem.ItemId.$.Id;
		const cal01ChangeKey = calItem.ItemId.$.ChangeKey;

		// EWS: GetItem - verify account2 is attendee
		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${cal01Id}" ChangeKey="${cal01ChangeKey}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');

		// EWS: UpdateItem - add account3 as attendee
		const updateRes = await ews.makeEWSRequest(
			`<m:UpdateItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:SavedItemFolderId>
					<t:FolderId Id="10" />
				</m:SavedItemFolderId>
				<m:ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${cal01Id}" ChangeKey="${cal01ChangeKey}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:RequiredAttendees" />
								<t:CalendarItem>
									<t:RequiredAttendees>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account3Username}</t:Name>
												<t:EmailAddress>${account3Email}</t:EmailAddress>
											</t:Mailbox>
										</t:Attendee>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account2Username}</t:Name>
												<t:EmailAddress>${account2Email}</t:EmailAddress>
											</t:Mailbox>
										</t:Attendee>
									</t:RequiredAttendees>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</m:ItemChanges>
			</m:UpdateItem>`,
			account1Email, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		assert.equal(updateMessage.$.ResponseClass, 'Success',
			'UpdateItem should succeed');
		const updatedItem = updateMessage.Items?.CalendarItem || updateMessage.Items?.Message;
		const cal02Id = updatedItem?.ItemId?.$.Id || cal01Id;
		const cal02ChangeKey = updatedItem?.ItemId?.$.ChangeKey || cal01ChangeKey;

		// EWS: GetItem - verify both attendees
		const getItem2Res = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${cal02Id}" ChangeKey="${cal02ChangeKey}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const getItem2Body = ews.getBody(getItem2Res);
		const getItem2Msg = getItem2Body.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const item2Msg = Array.isArray(getItem2Msg) ? getItem2Msg[0] : getItem2Msg;
		assert.equal(item2Msg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const attendees = item2Msg.Items.CalendarItem?.RequiredAttendees?.Attendee;
		const attendeeArray = Array.isArray(attendees) ? attendees : [attendees];
		const acct3Attendee = attendeeArray.find(
			a => a.Mailbox?.EmailAddress?.includes(account3Email.split('@')[0])
		);
		assert.exists(acct3Attendee, 'Account3 should be an attendee');
		assert.equal(acct3Attendee.ResponseType, 'NoResponseReceived',
			'Account3 response should be NoResponseReceived');
		const acct2Attendee = attendeeArray.find(
			a => a.Mailbox?.EmailAddress?.includes(account2Email.split('@')[0])
		);
		assert.exists(acct2Attendee, 'Account2 should be an attendee');
		assert.equal(acct2Attendee.ResponseType, 'Accept',
			'Account2 response should be Accept');
	});
});
