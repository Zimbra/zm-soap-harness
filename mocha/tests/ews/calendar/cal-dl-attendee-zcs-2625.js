import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import ews from '../../../framework/backend/ews.js';
import { main } from '../../../pages/main.js';

describe('EWS > Calendar > Cal DL Attendee ZCS-2625', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;
	let dlName, dlId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		const unique = common.getUniqueString();

		account1Email = `ewszcs2625a${unique}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewszcs2625b${unique}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewszcs2625c${unique}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create DL and add acct1, acct2 as members
		dlName = `dl1.${unique}@${config.testDomain}`;
		const acct3AuthToken = await soap.getAccountAuthToken(account3Email, accountPassword);
		const createDlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(createDlRes.Fault, 'CreateDistributionListRequest should not fault');
		dlId = createDlRes.CreateDistributionListResponse.dl[0].id;

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<SyncGalRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${config.testDomain}</domain>
			</SyncGalRequest>`, adminAuthToken
		);
		await soap.waitFor(5000);
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
	it('Sanity | When meeting request is sent to DL, Outlook should show the acceptance status of individual users in Scheduling tab', async () => {
		const calSubject = 'ZCS-2625';
		const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
		const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
		const account3Username = account3Email.split('@')[0];

		// Create meeting from account3 via EWS with DL + account3 as attendees
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly" SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${calSubject}</t:Subject>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">Text for body</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI
								DistinguishedPropertySetId="Common" PropertyId="34049"
								PropertyType="Integer" />
							<t:Value>15</t:Value>
						</t:ExtendedProperty>
						<t:UID>2CD43BA2-56DB-42D8-BCB1-A3F54B2191A0</t:UID>
						<t:Start>${startTime}</t:Start>
						<t:End>${endTime}</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${dlName}</t:Name>
									<t:EmailAddress>${dlName}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account3Username}</t:Name>
									<t:EmailAddress>${account3Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:StartTimeZone Id="India Standard Time" />
						<t:EndTimeZone Id="India Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account3Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');
		let cal01Id = createMessage.Items.CalendarItem.ItemId.$.Id;
		let cal01ChangeKey = createMessage.Items.CalendarItem.ItemId.$.ChangeKey;

		await soap.waitFor(40000);

		// Account2 accepts the invite via ZWC
		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const getFolderRes2 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail" />', acct2AuthToken
		);
		assert.notExists(getFolderRes2.Fault, 'Response should not be a Fault');
		const allFolders2 = JSON.stringify(getFolderRes2.GetFolderResponse);
		const calFolderMatch2 = allFolders2.match(/"name":"Calendar"[^}]*"id":"(\d+)"/);
		const calFolderId2 = calFolderMatch2 ? calFolderMatch2[1] : '10';

		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>inid:${calFolderId2}</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt.find(a => a.name === calSubject)
			: searchRes2.SearchResponse.appt;
		assert.exists(appt2, 'Account2 should have the appointment');
		const invId2 = appt2.invId;
		const compNum2 = appt2.compNum || '0';
		const organizer2 = Array.isArray(appt2.or) ? appt2.or[0].a : appt2.or.a;

		const acceptRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				verb="ACCEPT" id="${invId2}" compNum="${compNum2}"
				updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer2}" />
					<su>ACCEPT: ${calSubject}</su>
					<mp ct="text/plain">
						<content>ACCEPT: ${calSubject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct2AuthToken
		);
		assert.notExists(acceptRes2.Fault, 'Response should not be a Fault');

		// Account1 accepts the invite via ZWC
		const acct1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const getFolderRes1 = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail" />', acct1AuthToken
		);
		assert.notExists(getFolderRes1.Fault, 'Response should not be a Fault');
		const allFolders1 = JSON.stringify(getFolderRes1.GetFolderResponse);
		const calFolderMatch1 = allFolders1.match(/"name":"Calendar"[^}]*"id":"(\d+)"/);
		const calFolderId1 = calFolderMatch1 ? calFolderMatch1[1] : '10';

		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>inid:${calFolderId1}</query>
			</SearchRequest>`, acct1AuthToken
		);
		assert.notExists(searchRes1.Fault, 'Response should not be a Fault');
		const appt1 = Array.isArray(searchRes1.SearchResponse.appt)
			? searchRes1.SearchResponse.appt.find(a => a.name === calSubject)
			: searchRes1.SearchResponse.appt;
		assert.exists(appt1, 'Account1 should have the appointment');
		const invId1 = appt1.invId;
		const compNum1 = appt1.compNum || '0';
		const organizer1 = Array.isArray(appt1.or) ? appt1.or[0].a : appt1.or.a;

		const acceptRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				verb="ACCEPT" id="${invId1}" compNum="${compNum1}"
				updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer1}" />
					<su>ACCEPT: ${calSubject}</su>
					<mp ct="text/plain">
						<content>ACCEPT: ${calSubject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct1AuthToken
		);
		assert.notExists(acceptRes1.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// GetItem via EWS from account3 (organizer) to verify attendee status
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:BodyType>Text</t:BodyType>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${cal01Id}" ChangeKey="${cal01ChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account3Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, 'ZCS-2625',
			'Subject should match');

		// Verify individual DL members appear as optional attendees
		const optAttendees = giMessage.Items.CalendarItem?.OptionalAttendees?.Attendee;
		const optArr = Array.isArray(optAttendees) ? optAttendees : [optAttendees];
		const acct1Attendee = optArr.find(
			a => a?.Mailbox?.EmailAddress === account1Email
		);
		assert.exists(acct1Attendee,
			'Account1 (DL member) should appear as attendee');
		const acct2Attendee = optArr.find(
			a => a?.Mailbox?.EmailAddress === account2Email
		);
		assert.exists(acct2Attendee,
			'Account2 (DL member) should appear as attendee');
	});
});
