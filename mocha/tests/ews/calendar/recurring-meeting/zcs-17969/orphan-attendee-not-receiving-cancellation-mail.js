import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

describe('EWS > Calendar > RecurringMeeting > ZCS-17969 > Orphan Attendee Not Receiving Cancellation Mail', function () {
	this.timeout(300 * 1000);
	let adminAuthToken,
		account1Email,
		account2Email,
		account3Email,
		accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = config.accountPassword;
		account1Email = `testAccount1.${unique}@${config.testDomain}`;
		account2Email = `testAccount2.${unique}@${config.testDomain}`;
		account3Email = `testAccount3.${unique}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);
	});

	// Applicable zimbra versions
	if (
		config.serial === true ||
		!String(config.serverEnvironment)
			.toUpperCase()
			.match(/ZIMBRA101|ZIMBRAX/)
	) {
		return;
	}

	// Tests
	it('Sanity | Create a recurring meeting in Outlook (EWS) show all instances in ZWC When an occurrence is modified (exception) and then cancelled from Outlook, the cancellation mail to attendees should include the updated subject of that occurrence', async () => {
		const unique = common.getUniqueString();
		const subject1 = `subject1.${unique}`;
		const updatedSubject2 = `updated_subject2.${unique}`;
		const uid = `${unique}-D714-429E-94D7-80A1A975F61E`;
		const startDate = common.getXMLTime(1440); // tomorrow
		const endDate = common.getXMLTime(1500);
		const startDateOnly = startDate.substring(0, 10);
		const endDateOnly = common.getXMLTime(5760).substring(0, 10); // 4 days out
		const day2Start = common.getXMLTime(2880);
		const day2End = common.getXMLTime(2940);
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${subject1}</t:Subject>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="CalendarTimeZone"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="String" />
							<t:Value>Asia/Kolkata</t:Value>
						</t:ExtendedProperty>
						<t:UID>${uid}</t:UID>
						<t:Start>${startDate}</t:Start>
						<t:End>${endDate}</t:End>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:Recurrence>
							<t:DailyRecurrence>
								<t:Interval>1</t:Interval>
							</t:DailyRecurrence>
							<t:EndDateRecurrence>
								<t:StartDate>${startDateOnly}</t:StartDate>
								<t:EndDate>${endDateOnly}</t:EndDate>
							</t:EndDateRecurrence>
						</t:Recurrence>
						<t:MeetingTimeZone TimeZoneName="India Standard Time" />
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Email.split('@')[0]}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
							</t:Attendee>
						</t:RequiredAttendees>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;

		// Verify response
		assert.equal(
			createMsg.$.ResponseClass,
			'Success',
			'CreateItem should succeed',
		);
		const masterId = createMsg.Items.CalendarItem.ItemId.$.Id;
		const masterCk = createMsg.Items.CalendarItem.ItemId.$.ChangeKey;
		assert.exists(masterId, 'Master recurring ItemId should exist');
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
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		assert.equal(
			syncMsg.$.ResponseClass,
			'Success',
			'SyncFolderItems should succeed',
		);

		// Authenticate account
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email,
			accountPassword,
		);

		await common.delay(5000);

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${subject1}</query>
			</SearchRequest>`,
			account1AuthToken,
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0]
			: searchRes.SearchResponse.appt;
		const invId = appt.invId;
		assert.exists(invId, 'Appointment invId should exist');

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`,
			account1AuthToken,
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const acceptRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:AcceptItem>
						<t:ReferenceItemId Id="${masterId}" />
					</t:AcceptItem>
				</Items>
			</CreateItem>`,
			account2Email,
			accountPassword,
		);
		const acceptBody = ews.getBody(acceptRes);
		const acceptMsg =
			acceptBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		assert.equal(
			acceptMsg.$.ResponseClass,
			'Success',
			'AcceptItem should succeed',
		);
		const syncRes2 = await ews.makeEWSRequest(
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
			account1Email,
			accountPassword,
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 =
			syncBody2.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		assert.equal(
			syncMsg2.$.ResponseClass,
			'Success',
			'SyncFolderItems should succeed',
		);
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<ItemChanges>
					<t:ItemChange>
						<t:OccurrenceItemId RecurringMasterId="${masterId}"
							ChangeKey="${masterCk}"
							InstanceIndex="2" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${updatedSubject2}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:Start" />
								<t:CalendarItem>
									<t:Start>${day2Start}</t:Start>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:End" />
								<t:CalendarItem>
									<t:End>${day2End}</t:End>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:RequiredAttendees" />
								<t:CalendarItem>
									<t:RequiredAttendees>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account2Email.split('@')[0]}</t:Name>
												<t:EmailAddress>${account2Email}</t:EmailAddress>
											</t:Mailbox>
										</t:Attendee>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account3Email.split('@')[0]}</t:Name>
												<t:EmailAddress>${account3Email}</t:EmailAddress>
											</t:Mailbox>
										</t:Attendee>
									</t:RequiredAttendees>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email,
			accountPassword,
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg =
			updateBody.UpdateItemResponse.ResponseMessages.UpdateItemResponseMessage;
		assert.equal(
			updateMsg.$.ResponseClass,
			'Success',
			'UpdateItem (exception) should succeed',
		);
		await common.delay(5000);

		const now = new Date();
		const expandStart = now.getTime();
		const expandEnd = expandStart + 30 * 24 * 60 * 60 * 1000;

		// Search item
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${expandStart}" calExpandInstEnd="${expandEnd}"
				limit="1000" offset="0">
				<query>(inid:10)</query>
			</SearchRequest>`,
			account1AuthToken,
		);

		// Verify response
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appts = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt
			: [searchRes2.SearchResponse.appt];
		let exceptionInvId = null;
		for (const a of appts) {
			if (!a || !a.inst) continue;
			const instances = Array.isArray(a.inst) ? a.inst : [a.inst];
			for (const inst of instances) {
				if (inst.ex === '1' || inst.ex === 1 || inst.ex === true) {
					exceptionInvId = inst.invId;
					break;
				}
			}
			if (exceptionInvId) break;
		}
		assert.exists(exceptionInvId, 'Exception instance invId should exist');

		// Get the message
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${exceptionInvId}" />
			</GetMsgRequest>`,
			account1AuthToken,
		);

		// Verify response
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const exMsg = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0]
			: getMsgRes2.GetMsgResponse.m;
		const exInv = Array.isArray(exMsg.inv) ? exMsg.inv[0] : exMsg.inv;
		const exComp = Array.isArray(exInv.comp) ? exInv.comp[0] : exInv.comp;
		assert.equal(
			exComp.name,
			updatedSubject2,
			'Exception subject should match',
		);
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<ItemIds>
					<t:OccurrenceItemId RecurringMasterId="${masterId}"
						InstanceIndex="2" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg =
			getItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		assert.equal(getItemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const cancelTargetId = getItemMsg.Items.CalendarItem.ItemId.$.Id;
		const cancelTargetCk = getItemMsg.Items.CalendarItem.ItemId.$.ChangeKey;
		assert.exists(cancelTargetId, 'Occurrence ItemId should exist');
		const cancelRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:CancelCalendarItem>
						<t:ReferenceItemId Id="${cancelTargetId}"
							ChangeKey="${cancelTargetCk}" />
					</t:CancelCalendarItem>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const cancelBody = ews.getBody(cancelRes);
		const cancelMsg =
			cancelBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		assert.equal(
			cancelMsg.$.ResponseClass,
			'Success',
			'CancelCalendarItem should succeed',
		);
		await common.delay(5000);

		const day2Ms = new Date(day2Start).getTime();
		const narrowStart = day2Ms - 60 * 60 * 1000;
		const narrowEnd = day2Ms + 60 * 60 * 1000;

		// Search item
		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${narrowStart}" calExpandInstEnd="${narrowEnd}">
				<query>(inid:10)</query>
			</SearchRequest>`,
			account1AuthToken,
		);

		// Verify response
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');

		const remainingAppts = searchRes3.SearchResponse.appt;
		if (remainingAppts) {
			const rArr = Array.isArray(remainingAppts)
				? remainingAppts
				: [remainingAppts];
			for (const a of rArr) {
				if (!a || !a.inst) continue;
				const instArr = Array.isArray(a.inst) ? a.inst : [a.inst];
				for (const inst of instArr) {
					assert.notEqual(
						inst.ex,
						'1',
						'No exception instance should remain after cancellation',
					);
				}
			}
		}

		// Authenticate account
		const account2AuthToken = await soap.getAccountAuthToken(
			account2Email,
			accountPassword,
		);

		await common.delay(5000);

		// Search item
		const searchRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${updatedSubject2}</query>
			</SearchRequest>`,
			account2AuthToken,
		);

		// Verify response
		assert.notExists(searchRes4.Fault, 'Response should not be a Fault');
		const cancelMail = Array.isArray(searchRes4.SearchResponse.m)
			? searchRes4.SearchResponse.m[0]
			: searchRes4.SearchResponse.m;
		assert.exists(cancelMail, 'Cancellation mail should exist for attendee');

		// Get the message
		const getMsgRes3 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${cancelMail.id}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);

		// Verify response
		assert.notExists(getMsgRes3.Fault, 'Response should not be a Fault');
		const cancelMailMsg = Array.isArray(getMsgRes3.GetMsgResponse.m)
			? getMsgRes3.GetMsgResponse.m[0]
			: getMsgRes3.GetMsgResponse.m;
		assert.include(
			cancelMailMsg.su,
			`Cancelled: ${updatedSubject2}`,
			'Cancellation mail subject should include updated subject',
		);
		const cancelInv = Array.isArray(cancelMailMsg.inv)
			? cancelMailMsg.inv[0]
			: cancelMailMsg.inv;
		const cancelComp = Array.isArray(cancelInv.comp)
			? cancelInv.comp[0]
			: cancelInv.comp;
		assert.equal(cancelComp.method, 'CANCEL', 'Should have CANCEL method');

		// Authenticate account
		const account3AuthToken = await soap.getAccountAuthToken(
			account3Email,
			accountPassword,
		);

		await common.delay(5000);

		// Search item
		const searchRes5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${updatedSubject2}</query>
			</SearchRequest>`,
			account3AuthToken,
		);

		// Verify response
		assert.notExists(searchRes5.Fault, 'Response should not be a Fault');
		const orphanCancelMail = Array.isArray(searchRes5.SearchResponse.m)
			? searchRes5.SearchResponse.m[0]
			: searchRes5.SearchResponse.m;
		assert.exists(
			orphanCancelMail,
			'Cancellation mail should exist for orphan attendee',
		);

		// Get the message
		const getMsgRes4 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${orphanCancelMail.id}" />
			</GetMsgRequest>`,
			account3AuthToken,
		);

		// Verify response
		assert.notExists(getMsgRes4.Fault, 'Response should not be a Fault');
		const orphanCancelMsg = Array.isArray(getMsgRes4.GetMsgResponse.m)
			? getMsgRes4.GetMsgResponse.m[0]
			: getMsgRes4.GetMsgResponse.m;
		assert.include(
			orphanCancelMsg.su,
			`Cancelled: ${updatedSubject2}`,
			'Orphan attendee cancellation mail subject should include updated subject',
		);
		const orphanInv = Array.isArray(orphanCancelMsg.inv)
			? orphanCancelMsg.inv[0]
			: orphanCancelMsg.inv;
		const orphanComp = Array.isArray(orphanInv.comp)
			? orphanInv.comp[0]
			: orphanInv.comp;
		assert.equal(orphanComp.method, 'CANCEL', 'Should have CANCEL method');
	});
});
