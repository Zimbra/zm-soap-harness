import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Modify Draft Priority From Zwc', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		const accountName = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountEmail = accountName;
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
	it('Sanity | Create draft with low priority in EWS and sync on ZWC Verify in ZWC that draft is created with low priority', async () => {
		const messageSubject = 'Modify draft priority from low to high from ZWC - subject';
		const messageContent = 'Modify draft priority from low to high from ZWC - content';
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xNi4wLjE2MDUwNgpTdWJqZWN0OiBNb2RpZnkgZHJhZnQgcHJpb3JpdHkgZnJvbSBsb3cgdG8gaGlnaCBmcm9tIFpXQyAtIHN1YmplY3QKTWVzc2FnZS1JRDogPEQwOTVBMjE2LTQ2RTktNDJCNC1BMDFGLUEwRDdEQjZENDhDRUB6ZGV2LXZtMDA5LmVuZy56aW1icmEuY29tPgpUaHJlYWQtVG9waWM6IE1vZGlmeSBkcmFmdCBwcmlvcml0eSBmcm9tIGxvdyB0byBoaWdoIGZyb20gWldDIC0gc3ViamVjdApYLVByaW9yaXR5OiA0Ck1pbWUtdmVyc2lvbjogMS4wCkNvbnRlbnQtdHlwZTogbXVsdGlwYXJ0L2FsdGVybmF0aXZlOwoJYm91bmRhcnk9IkJfMzU2NjczNDE1M18zNTE4NDU3NzkiCgo+IFRoaXMgbWVzc2FnZSBpcyBpbiBNSU1FIGZvcm1hdC4gU2luY2UgeW91ciBtYWlsIHJlYWRlciBkb2VzIG5vdCB1bmRlcnN0YW5kCnRoaXMgZm9ybWF0LCBzb21lIG9yIGFsbCBvZiB0aGlzIG1lc3NhZ2UgbWF5IG5vdCBiZSBsZWdpYmxlLgoKLS1CXzM1NjY3MzQxNTNfMzUxODQ1Nzc5CkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiA3Yml0CgpNb2RpZnkgZHJhZnQgcHJpb3JpdHkgZnJvbSBsb3cgdG8gaGlnaCBmcm9tIFpXQyAtIGNvbnRlbnQKCgotLUJfMzU2NjczNDE1M18zNTE4NDU3NzkKQ29udGVudC10eXBlOiB0ZXh0L2h0bWw7CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogcXVvdGVkLXByaW50YWJsZQoKPGh0bWwgeG1sbnM6bz0zRCJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOm9mZmljZTpvZmZpY2UiIHhtbG5zOnc9M0QidXJuOnNjaGVtYT0Kcy1taWNyb3NvZnQtY29tOm9mZmljZTp3b3JkIiB4bWxuczptPTNEImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vb2ZmaWNlLzIwPQowNC8xMi9vbW1sIiB4bWxucz0zRCJodHRwOi8vd3d3LnczLm9yZy9UUi9SRUMtaHRtbDQwIj48aGVhZD48bWV0YSBuYW1lPTNEVGl0bGUgYz0Kb250ZW50PTNEIiI+PG1ldGEgbmFtZT0zREtleXdvcmRzIGNvbnRlbnQ9M0QiIj48bWV0YSBodHRwLWVxdWl2PTNEQ29udGVudC1UeXBlIGNvbnRlPQpudD0zRCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9M0R1dGYtOCI+PG1ldGEgbmFtZT0zREdlbmVyYXRvciBjb250ZW50PTNEIk1pY3Jvc29mdCBXb3JkIDE9CjUgKGZpbHRlcmVkIG1lZGl1bSkiPjxzdHlsZT48IS0tCi8qIEZvbnQgRGVmaW5pdGlvbnMgKi8KQGZvbnQtZmFjZQoJe2ZvbnQtZmFtaWx5OiJDYW1icmlhIE1hdGgiOwoJcGFub3NlLTE6MCAwIDAgMCAwIDAgMCAwIDAgMDt9CkBmb250LWZhY2UKCXtmb250LWZhbWlseTpDYWxpYnJpOwoJcGFub3NlLTE6MiAxNSA1IDIgMiAyIDQgMyAyIDQ7fQovKiBTdHlsZSBEZWZpbml0aW9ucyAqLwpwLk1zb05vcm1hbCwgbGkuTXNvTm9ybWFsLCBkaXYuTXNvTm9ybWFsCgl7bWFyZ2luOjBjbTsKCW1hcmdpbi1ib3R0b206LjAwMDFwdDsKCWZvbnQtc2l6ZToxMi4wcHQ7Cglmb250LWZhbWlseTpDYWxpYnJpO30KYTpsaW5rLCBzcGFuLk1zb0h5cGVybGluawoJe21zby1zdHlsZS1wcmlvcml0eTo5OTsKCWNvbG9yOiMwNTYzQzE7Cgl0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lO30KYTp2aXNpdGVkLCBzcGFuLk1zb0h5cGVybGlua0ZvbGxvd2VkCgl7bXNvLXN0eWxlLXByaW9yaXR5Ojk5OwoJY29sb3I6Izk1NEY3MjsKCXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7fQpzcGFuLkVtYWlsU3R5bGUxNwoJe21zby1zdHlsZS10eXBlOnBlcnNvbmFsLWNvbXBvc2U7Cglmb250LWZhbWlseTpDYWxpYnJpOwoJY29sb3I6d2luZG93dGV4dDt9CnNwYW4ubXNvSW5zCgl7bXNvLXN0eWxlLXR5cGU6ZXhwb3J0LW9ubHk7Cgltc28tc3R5bGUtbmFtZToiIjsKCXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7Cgljb2xvcjp0ZWFsO30KLk1zb0NocERlZmF1bHQKCXttc28tc3R5bGUtdHlwZTpleHBvcnQtb25seTsKCWZvbnQtZmFtaWx5OkNhbGlicmk7fQpAcGFnZSBXb3JkU2VjdGlvbjEKCXtzaXplOjU5NS4wcHQgODQyLjBwdDsKCW1hcmdpbjo3Mi4wcHQgNzIuMHB0IDcyLjBwdCA3Mi4wcHQ7fQpkaXYuV29yZFNlY3Rpb24xCgl7cGFnZTpXb3JkU2VjdGlvbjE7fQotLT48L3N0eWxlPjwvaGVhZD48Ym9keSBiZ2NvbG9yPTNEd2hpdGUgbGFuZz0zREVOLVVTIGxpbms9M0QiIzA1NjNDMSIgdmxpbms9M0QiIzk1ND0KRjcyIj48ZGl2IGNsYXNzPTNEV29yZFNlY3Rpb24xPjxwIGNsYXNzPTNETXNvTm9ybWFsPjxzcGFuIHN0eWxlPTNEJ2ZvbnQtc2l6ZToxMS4wcD0KdCc+TW9kaWZ5IGRyYWZ0IHByaW9yaXR5IGZyb20gbG93IHRvIGhpZ2ggZnJvbSBaV0MgLSBjb250ZW50PG86cD48L286cD48L3NwYW4+PC9wPjwvZGl2PjwvYm9keT48L2h0bWw+CgotLUJfMzU2NjczNDE1M18zNTE4NDU3NzktLQoK</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Low</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07"
								PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090"
								PropertyType="Integer"/>
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34051" PropertyType="Boolean"/>
							<t:Value>false</t:Value>
						</t:ExtendedProperty>
						<t:From>
							<t:Mailbox>
								<t:EmailAddress>${accountEmail}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="6" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const messages = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : [];
		assert.isAbove(messages.length, 0, 'Should find message');
		const msgId = messages[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should match');
		assert.include(msgObj.f, 'sd?', 'Flags should contain sd? (draft + low priority)');

		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m f="!">
					<id>${msgId}</id>
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not be a Fault');
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="drafts">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const draftsId = folderMsg.Folders.Folder.FolderId.$.Id;
		assert.equal(draftsId, '6', 'Drafts folder Id should be 6');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Drafts',
			'DisplayName should be Drafts');
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${draftsId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage2.Changes.Create)
			? syncMessage2.Changes.Create : [syncMessage2.Changes.Create];
		const lastCreate = creates[creates.length - 1];
		const mailItemId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="message:ToRecipients" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="item:Importance"/>
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.equal(itemMsg.Items.Message.Importance, 'High',
			'Importance should be High after ZWC modification');
	});


	it('Sanity | Create draft with high priority in EWS and sync on ZWC Verify in ZWC that draft is created with high priority', async () => {
		const messageSubject = 'Modify draft priority from high to low from ZWC - subject';
		const messageContent = 'Modify draft priority from high to low from ZWC - content';
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xNi4wLjE2MDUwNgpTdWJqZWN0OiBNb2RpZnkgZHJhZnQgcHJpb3JpdHkgZnJvbSBoaWdoIHRvIGxvdyBmcm9tIFpXQyAtIHN1YmplY3QKTWVzc2FnZS1JRDogPEQwOTVBMjE2LTQ2RTktNDJCNC1BMDFGLUEwRDdEQjZENDhDRUB6ZGV2LXZtMDA5LmVuZy56aW1icmEuY29tPgpUaHJlYWQtVG9waWM6IE1vZGlmeSBkcmFmdCBwcmlvcml0eSBmcm9tIGhpZ2ggdG8gbG93IGZyb20gWldDIC0gc3ViamVjdApYLVByaW9yaXR5OiAyCk1pbWUtdmVyc2lvbjogMS4wCkNvbnRlbnQtdHlwZTogbXVsdGlwYXJ0L2FsdGVybmF0aXZlOwoJYm91bmRhcnk9IkJfMzU2NjczNDE1M18zNTE4NDU3NzkiCgo+IFRoaXMgbWVzc2FnZSBpcyBpbiBNSU1FIGZvcm1hdC4gU2luY2UgeW91ciBtYWlsIHJlYWRlciBkb2VzIG5vdCB1bmRlcnN0YW5kCnRoaXMgZm9ybWF0LCBzb21lIG9yIGFsbCBvZiB0aGlzIG1lc3NhZ2UgbWF5IG5vdCBiZSBsZWdpYmxlLgoKLS1CXzM1NjY3MzQxNTNfMzUxODQ1Nzc5CkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiA3Yml0CgpNb2RpZnkgZHJhZnQgcHJpb3JpdHkgZnJvbSBoaWdoIHRvIGxvdyBmcm9tIFpXQyAtIGNvbnRlbnQKCgotLUJfMzU2NjczNDE1M18zNTE4NDU3NzkKQ29udGVudC10eXBlOiB0ZXh0L2h0bWw7CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogcXVvdGVkLXByaW50YWJsZQoKPGh0bWwgeG1sbnM6bz0zRCJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOm9mZmljZTpvZmZpY2UiIHhtbG5zOnc9M0QidXJuOnNjaGVtYT0Kcy1taWNyb3NvZnQtY29tOm9mZmljZTp3b3JkIiB4bWxuczptPTNEImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vb2ZmaWNlLzIwPQowNC8xMi9vbW1sIiB4bWxucz0zRCJodHRwOi8vd3d3LnczLm9yZy9UUi9SRUMtaHRtbDQwIj48aGVhZD48bWV0YSBuYW1lPTNEVGl0bGUgYz0Kb250ZW50PTNEIiI+PG1ldGEgbmFtZT0zREtleXdvcmRzIGNvbnRlbnQ9M0QiIj48bWV0YSBodHRwLWVxdWl2PTNEQ29udGVudC1UeXBlIGNvbnRlPQpudD0zRCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9M0R1dGYtOCI+PG1ldGEgbmFtZT0zREdlbmVyYXRvciBjb250ZW50PTNEIk1pY3Jvc29mdCBXb3JkIDE9CjUgKGZpbHRlcmVkIG1lZGl1bSkiPjxzdHlsZT48IS0tCi8qIEZvbnQgRGVmaW5pdGlvbnMgKi8KQGZvbnQtZmFjZQoJe2ZvbnQtZmFtaWx5OiJDYW1icmlhIE1hdGgiOwoJcGFub3NlLTE6MCAwIDAgMCAwIDAgMCAwIDAgMDt9CkBmb250LWZhY2UKCXtmb250LWZhbWlseTpDYWxpYnJpOwoJcGFub3NlLTE6MiAxNSA1IDIgMiAyIDQgMyAyIDQ7fQovKiBTdHlsZSBEZWZpbml0aW9ucyAqLwpwLk1zb05vcm1hbCwgbGkuTXNvTm9ybWFsLCBkaXYuTXNvTm9ybWFsCgl7bWFyZ2luOjBjbTsKCW1hcmdpbi1ib3R0b206LjAwMDFwdDsKCWZvbnQtc2l6ZToxMi4wcHQ7Cglmb250LWZhbWlseTpDYWxpYnJpO30KYTpsaW5rLCBzcGFuLk1zb0h5cGVybGluawoJe21zby1zdHlsZS1wcmlvcml0eTo5OTsKCWNvbG9yOiMwNTYzQzE7Cgl0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lO30KYTp2aXNpdGVkLCBzcGFuLk1zb0h5cGVybGlua0ZvbGxvd2VkCgl7bXNvLXN0eWxlLXByaW9yaXR5Ojk5OwoJY29sb3I6Izk1NEY3MjsKCXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7fQpzcGFuLkVtYWlsU3R5bGUxNwoJe21zby1zdHlsZS10eXBlOnBlcnNvbmFsLWNvbXBvc2U7Cglmb250LWZhbWlseTpDYWxpYnJpOwoJY29sb3I6d2luZG93dGV4dDt9CnNwYW4ubXNvSW5zCgl7bXNvLXN0eWxlLXR5cGU6ZXhwb3J0LW9ubHk7Cgltc28tc3R5bGUtbmFtZToiIjsKCXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7Cgljb2xvcjp0ZWFsO30KLk1zb0NocERlZmF1bHQKCXttc28tc3R5bGUtdHlwZTpleHBvcnQtb25seTsKCWZvbnQtZmFtaWx5OkNhbGlicmk7fQpAcGFnZSBXb3JkU2VjdGlvbjEKCXtzaXplOjU5NS4wcHQgODQyLjBwdDsKCW1hcmdpbjo3Mi4wcHQgNzIuMHB0IDcyLjBwdCA3Mi4wcHQ7fQpkaXYuV29yZFNlY3Rpb24xCgl7cGFnZTpXb3JkU2VjdGlvbjE7fQotLT48L3N0eWxlPjwvaGVhZD48Ym9keSBiZ2NvbG9yPTNEd2hpdGUgbGFuZz0zREVOLVVTIGxpbms9M0QiIzA1NjNDMSIgdmxpbms9M0QiIzk1ND0KRjcyIj48ZGl2IGNsYXNzPTNEV29yZFNlY3Rpb24xPjxwIGNsYXNzPTNETXNvTm9ybWFsPjxzcGFuIHN0eWxlPTNEJ2ZvbnQtc2l6ZToxMS4wcD0KdCc+TW9kaWZ5IGRyYWZ0IHByaW9yaXR5IGZyb20gaGlnaCB0byBsb3cgZnJvbSBaV0MgLSBjb250ZW50PG86cD48L286cD48L3NwYW4+PC9wPjwvZGl2PjwvYm9keT48L2h0bWw+CgotLUJfMzU2NjczNDE1M18zNTE4NDU3NzktLQoK</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>High</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07"
								PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090"
								PropertyType="Integer"/>
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34051" PropertyType="Boolean"/>
							<t:Value>false</t:Value>
						</t:ExtendedProperty>
						<t:From>
							<t:Mailbox>
								<t:EmailAddress>${accountEmail}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="6" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const messages = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : [];
		assert.isAbove(messages.length, 0, 'Should find message');
		const msgId = messages[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should match');
		assert.include(msgObj.f, 'sd!', 'Flags should contain sd! (draft + high priority)');

		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m f="?">
					<id>${msgId}</id>
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not be a Fault');
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="drafts">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const draftsId = folderMsg.Folders.Folder.FolderId.$.Id;
		assert.equal(draftsId, '6', 'Drafts folder Id should be 6');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Drafts',
			'DisplayName should be Drafts');
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${draftsId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const allCreates = Array.isArray(syncMessage2.Changes.Create)
			? syncMessage2.Changes.Create : [syncMessage2.Changes.Create];
		const lastCreate = allCreates[allCreates.length - 1];
		const mailItemId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4"
							PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="message:ToRecipients" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="item:Importance"/>
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.equal(itemMsg.Items.Message.Importance, 'Low',
			'Importance should be Low after ZWC modification');
	});
});
