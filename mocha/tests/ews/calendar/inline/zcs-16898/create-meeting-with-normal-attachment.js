import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

const IMAGE_CONTENT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

describe('EWS > Calendar > Inline > ZCS-16898 > Create Meeting With Normal Attachment', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, accountPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = 'test123';
		account1Email = `test1.${unique}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
	it('Sanity | Create and save appointment which is having normal attachment from EWS and sync on ZWC client', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject1.${unique}`;

		// Create appointment from EWS
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly"
				SendMeetingInvitations="SendToNone">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${apptSubject}</t:Subject>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">This is body text</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>${common.getXMLTime(60)}</t:Start>
						<t:End>${common.getXMLTime(120)}</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:AllowNewTimeProposal>true</t:AllowNewTimeProposal>
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
		assert.exists(calItemId, 'Calendar item Id should exist');

		// Attach normal (non-inline) attachment
		const attachRes = await ews.makeEWSRequest(
			`<CreateAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentItemId Id="${calItemId}" />
				<Attachments>
					<t:FileAttachment>
						<t:Name>image.jpeg</t:Name>
						<t:ContentType>image/png</t:ContentType>
						<t:ContentId />
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

		// Sync on EWS
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

		// Verify on ZWC
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		assert.equal(appt.name, apptSubject, 'Appointment name should match');
		const invId = appt.invId;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;

		// Verify normal attachment part exists
		const findAttachmentPart = (parts) => {
			if (!parts) return null;
			const partsArr = Array.isArray(parts) ? parts : [parts];
			for (const part of partsArr) {
				if (part.ct === 'image/png' && part.cd === 'attachment') return part;
				if (part.mp) {
					const found = findAttachmentPart(part.mp);
					if (found) return found;
				}
			}
			return null;
		};
		const attachPart = findAttachmentPart(msg.mp);
		assert.exists(attachPart, 'Should have an attachment image/png part');
		assert.equal(attachPart.cd, 'attachment', 'Content disposition should be attachment');
	});
});
