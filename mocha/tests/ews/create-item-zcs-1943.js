import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > CreateItem ZCS-1943', function () {
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
	it('Sanity | CreateItem request with distinguished folder ID for calendar item', async () => {
		const messageSubject = `subject${common.getUniqueString()}`;
		const messageContent = 'Message test content';

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:DistinguishedFolderId Id="calendar" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem
						xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
						<Subject>${messageSubject}</Subject>
						<Body BodyType="Text">${messageContent}</Body>
						<ReminderIsSet>true</ReminderIsSet>
						<ReminderMinutesBeforeStart>60</ReminderMinutesBeforeStart>
						<Start>2018-11-02T14:00:00</Start>
						<End>2018-11-02T15:00:00</End>
						<IsAllDayEvent>false</IsAllDayEvent>
						<LegacyFreeBusyStatus>Busy</LegacyFreeBusyStatus>
						<t:UID>0A1BB546-7FB0-4721-85B1-90961A79BB38</t:UID>
						<RequiredAttendees>
							<Attendee>
								<Mailbox>
									<EmailAddress>${account2Email}</EmailAddress>
								</Mailbox>
							</Attendee>
						</RequiredAttendees>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');
		assert.exists(createMessage.Items.CalendarItem.ItemId.$.Id,
			'ItemId should be present');
	});


	it('Sanity | CreateItem request with distinguished folder ID for unmapped item', async () => {
		const messageSubject = `subject1${common.getUniqueString()}`;
		const messageContent = 'Message 1 test content';

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:DistinguishedFolderId Id="xyz" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem
						xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
						<Subject>${messageSubject}</Subject>
						<Body BodyType="Text">${messageContent}</Body>
						<ReminderIsSet>true</ReminderIsSet>
						<ReminderMinutesBeforeStart>60</ReminderMinutesBeforeStart>
						<Start>2018-11-03T14:00:00</Start>
						<End>2018-11-03T15:00:00</End>
						<IsAllDayEvent>false</IsAllDayEvent>
						<LegacyFreeBusyStatus>Busy</LegacyFreeBusyStatus>
						<Location>Conference Room 721</Location>
						<t:UID>0A1BB546-7FB0-4721-85B1-90961A79BB39</t:UID>
						<RequiredAttendees>
							<Attendee>
								<Mailbox>
									<EmailAddress>${account2Email}</EmailAddress>
								</Mailbox>
							</Attendee>
						</RequiredAttendees>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem with unmapped folder ID should succeed');
	});


	it('Sanity | CreateItem request with folder ID for calendar item with numeric value', async () => {
		const messageSubject = `subject2${common.getUniqueString()}`;
		const messageContent = 'Message 2 test content';

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem
						xmlns="http://schemas.microsoft.com/exchange/services/2006/types">
						<Subject>${messageSubject}</Subject>
						<Body BodyType="Text">${messageContent}</Body>
						<ReminderIsSet>true</ReminderIsSet>
						<ReminderMinutesBeforeStart>60</ReminderMinutesBeforeStart>
						<Start>2018-11-05T14:00:00</Start>
						<End>2018-11-05T15:00:00</End>
						<IsAllDayEvent>false</IsAllDayEvent>
						<LegacyFreeBusyStatus>Busy</LegacyFreeBusyStatus>
						<t:UID>0A1BB546-7FB0-4721-85B1-90961A79BB40</t:UID>
						<RequiredAttendees>
							<Attendee>
								<Mailbox>
									<EmailAddress>${account2Email}</EmailAddress>
								</Mailbox>
							</Attendee>
						</RequiredAttendees>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');
		assert.exists(createMessage.Items.CalendarItem.ItemId.$.Id,
			'ItemId should be present');
	});


	it('Sanity | CreateItem request with distinguished folder ID for mail item', async () => {
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:DistinguishedFolderId Id="inbox" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xNi4wLjE2MDUwNg0KRGF0ZTogVGh1LCAwNSBKYW4gMjAxNyAxNzo0ODoyMyArMDUzMA0KU3ViamVjdDogZ28gbWFuDQpNZXNzYWdlLUlEOiA8MTRDNkMwNTgtNDM2Mi00OTFDLTk4MDktMTg1OTFFQUQyRjIyQHpkZXYtdm0wMDkuZW5nLnppbWJyYS5jb20+DQpUaHJlYWQtVG9waWM6IGdvIG1hbg0KTWltZS12ZXJzaW9uOiAxLjANCkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsNCgljaGFyc2V0PSJVVEYtOCINCkNvbnRlbnQtdHJhbnNmZXItZW5jb2Rpbmc6IDdiaXQNCg0KDQphc2Rhc2Rhc2RhZA0KDQo=</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07"
								PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F"
								PropertyType="StringArray" />
							<t:Values>
								<t:Value>:R:0</t:Value>
							</t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Email.split('@')[0]}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Email.split('@')[0]}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem with inbox folder should succeed');
		assert.exists(createMessage.Items.Message.ItemId.$.Id,
			'Mail ItemId should be present');
	});


	it('Sanity | CreateItem request with distinguished folder ID for contact item', async () => {
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<SavedItemFolderId>
					<t:DistinguishedFolderId Id="contacts" />
				</SavedItemFolderId>
				<Items>
					<t:Contact>
						<t:GivenName>Test</t:GivenName>
						<t:CompanyName>Zimbra</t:CompanyName>
						<t:EmailAddresses>
							<t:Entry Key="EmailAddress1">test@example.com</t:Entry>
						</t:EmailAddresses>
						<t:PhysicalAddresses>
							<t:Entry Key="Business">
								<t:Street>1234 56th Ave</t:Street>
								<t:City>La Habra</t:City>
								<t:State>CA</t:State>
								<t:CountryOrRegion>USA</t:CountryOrRegion>
							</t:Entry>
						</t:PhysicalAddresses>
						<t:PhoneNumbers>
							<t:Entry Key="BusinessPhone">4255550199</t:Entry>
						</t:PhoneNumbers>
						<t:JobTitle>Manager</t:JobTitle>
						<t:Surname>Plate</t:Surname>
					</t:Contact>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem with contacts folder should succeed');
		assert.exists(createMessage.Items.Contact.ItemId.$.Id,
			'Contact ItemId should be present');
	});


	it('Sanity | MoveItem request with distinguished folder ID for mail item', async () => {
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);
		const messageSubject = `subject${common.getUniqueString()}`;
		const messageContent = 'Message test content';

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		await soap.waitFor(5000);
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
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
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2',
			'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox',
			'DisplayName should be Inbox');
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="inbox" />
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
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, "Should find message matching subject");
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;
		const moveRes = await ews.makeEWSRequest(
			`<MoveItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<ToFolderId>
					<t:DistinguishedFolderId Id="drafts" />
				</ToFolderId>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</MoveItem>`,
			account1Email, account1Password
		);
		const moveBody = ews.getBody(moveRes);
		const moveMsg = moveBody.MoveItemResponse
			.ResponseMessages.MoveItemResponseMessage;
		const moveMessage = Array.isArray(moveMsg) ? moveMsg[0] : moveMsg;
		assert.equal(moveMessage.$.ResponseClass, 'Success', 'MoveItem should succeed');
		assert.equal(moveMessage.ResponseCode, 'NoError', 'ResponseCode should be NoError');
	});


	it('Sanity | CopyItem request with distinguished folder ID for sent item', async () => {
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);
		const messageSubject = `subject${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>test content for copy</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		await common.delay(3000);
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:DistinguishedFolderId Id="inbox" />
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

		// Verify response
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const mailItemId = creates[creates.length - 1].Message.ItemId.$.Id;
		const copyRes = await ews.makeEWSRequest(
			`<CopyItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<ToFolderId>
					<t:DistinguishedFolderId Id="sentitems" />
				</ToFolderId>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" />
				</ItemIds>
			</CopyItem>`,
			account1Email, account1Password
		);
		const copyBody = ews.getBody(copyRes);
		const copyMsg = copyBody.CopyItemResponse
			.ResponseMessages.CopyItemResponseMessage;
		const copyMessage = Array.isArray(copyMsg) ? copyMsg[0] : copyMsg;
		assert.equal(copyMessage.$.ResponseClass, 'Success', 'CopyItem should succeed');
		assert.equal(copyMessage.ResponseCode, 'NoError', 'ResponseCode should be NoError');
	});


	it('Sanity | SyncFolderItems request with distinguished folder ID for calendar item', async () => {
		const appointmentSubject = `appsubject1${common.getUniqueString()}`;
		const appointmentContent = `appcont1${common.getUniqueString()}`;

		// Authenticate account
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, account2Password);

		// Create an appointment
		const createApptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${appointmentSubject}">
							<or a="${account2Email}" />
							<at a="${account1Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="20190101T120000" />
							<e d="20190101T130000" />
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

		// Verify response
		assert.notExists(createApptRes.Fault, 'CreateAppointmentRequest should not be a Fault');
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
		assert.equal(folderMsg.Folders.CalendarFolder.DisplayName, 'Calendar',
			'DisplayName should be Calendar');
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
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems with distinguished folder ID should succeed');
		assert.exists(syncMessage.SyncState, 'SyncState should be present');
	});
});
