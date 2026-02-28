import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

const IMAGE_CONTENT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const IMAGE_CONTENT_ID = 'image001.png@01DBD4E3.AB0FB680';

describe('EWS > Calendar > Inline > ZCS-16898 > Create Meeting With Both Attachment', function () {
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
	it('Sanity | Create and save appointment which is having normal attachment and inline attachment from EWS and sync on ZWC client', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject1.${unique}`;
		const htmlBody = `&lt;html&gt;&lt;body&gt;&lt;p&gt;&lt;img src="cid:${IMAGE_CONTENT_ID}"&gt;&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;`;

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
						<t:Body BodyType="HTML">${htmlBody}</t:Body>
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

		// Attach both inline and normal attachments
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
		const attachMsgArr = Array.isArray(attachMsg) ? attachMsg : [attachMsg];
		assert.isTrue(
			attachMsgArr.every(m => m.$.ResponseClass === 'Success'),
			'All CreateAttachment responses should succeed'
		);

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

		// Verify both inline and normal attachment parts exist
		const findParts = (parts, cd) => {
			const results = [];
			if (!parts) return results;
			const partsArr = Array.isArray(parts) ? parts : [parts];
			for (const part of partsArr) {
				if (part.ct === 'image/png' && part.cd === cd) results.push(part);
				if (part.mp) results.push(...findParts(part.mp, cd));
			}
			return results;
		};
		const inlineParts = findParts(msg.mp, 'inline');
		assert.isAbove(inlineParts.length, 0, 'Should have at least one inline image/png part');
		assert.include(
			inlineParts[0].ci, 'image001.png',
			'Inline part Content ID should contain image001.png'
		);

		const attachParts = findParts(msg.mp, 'attachment');
		assert.isAbove(attachParts.length, 0, 'Should have at least one attachment image/png part');
		assert.equal(
			attachParts[0].filename, 'image.jpeg',
			'Attachment filename should be image.jpeg'
		);
	});
});
