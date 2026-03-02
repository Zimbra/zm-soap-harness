import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Modify Draft From Zwc', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword, account2Email;
	const messageSubject = 'Create draft with only subject-subject';
	const messageContent = 'Modify draft-add content and recipient from ZWC-content';
	const messageSubject1 = 'Create draft with subject and content-subject';
	const messageContent1 = 'Create draft with subject content-content';
	const messageContent2 = 'Modify draft-Modify content from ZWC-content2';

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

		const account2Name = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${accountPassword}</password>
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
	it('Sanity | Create draft with subject in EWS and Sync on ZWC Modify same draft using ZWC, add content and recipient and sync to EWS', async () => {
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message><t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xZi4wLjE3MDIxNgpTdWJqZWN0OiBDcmVhdGUgZHJhZnQgd2l0aCBvbmx5IHN1YmplY3Qtc3ViamVjdApUaHJlYWQtVG9waWM6IENyZWF0ZSBkcmFmdCB3aXRoIG9ubHkgc3ViamVjdC1zdWJqZWN0Ck1pbWUtdmVyc2lvbjogMS4wCkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiA3Yml0</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer"/>
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common" PropertyId="34051" PropertyType="Boolean"/>
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
				<SyncState/>
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
		const su = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(su, 'Should find message');
		assert.include(su.su, messageSubject, 'Subject should match');
		const mailIdWc = su.id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${mailIdWc}" />
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should contain draft subject');

		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<id>${mailIdWc}</id>
					<e t="t" a="${account2Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not be a Fault');
		assert.exists(saveDraftRes.SaveDraftResponse, 'SaveDraftResponse should exist');
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
		const creates2 = Array.isArray(syncMessage2.Changes.Create)
			? syncMessage2.Changes.Create : [syncMessage2.Changes.Create];
		const mail02Id = creates2[creates2.length - 1].Message.ItemId.$.Id;
		const mail02ChangeKey = creates2[creates2.length - 1].Message.ItemId.$.ChangeKey;
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
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mail02Id}" ChangeKey="${mail02ChangeKey}" />
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
		const body = itemMsg.Items.Message.Body;
		const bodyText = typeof body === 'string' ? body : body._;
		assert.include(bodyText, messageContent, 'Body should contain modified content');
		const toRecipients = itemMsg.Items.Message.ToRecipients?.Mailbox;
		const toArray = Array.isArray(toRecipients) ? toRecipients : [toRecipients];
		const recipientMatch = toArray.find(m => m.EmailAddress === account2Email);
		assert.exists(recipientMatch, 'ToRecipients should contain account2 email');
	});


	it('Sanity | Create draft with subject and content in EWS and sync on ZWC Modify same draft using ZWC, Modify content and sync to EWS', async () => {
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages" MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message><t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4yNi4wLjE3MDkwMgpTdWJqZWN0OiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKVGhyZWFkLVRvcGljOiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7Cglib3VuZGFyeT0iQl8zNTg4Njg0NzUyXzExNDA3NDA4NTIiCgo+IFRoaXMgbWVzc2FnZSBpcyBpbiBNSU1FIGZvcm1hdC4gU2luY2UgeW91ciBtYWlsIHJlYWRlciBkb2VzIG5vdCB1bmRlcnN0YW5kCnRoaXMgZm9ybWF0LCBzb21lIG9yIGFsbCBvZiB0aGlzIG1lc3NhZ2UgbWF5IG5vdCBiZSBsZWdpYmxlLgoKLS1CXzM1ODg2ODQ3NTJfMTE0MDc0MDg1MgpDb250ZW50LXR5cGU6IHRleHQvcGxhaW47CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogN2JpdAoKQ3JlYXRlIGRyYWZ0IHdpdGggc3ViamVjdCBjb250ZW50LWNvbnRlbnQKCgotLUJfMzU4ODY4NDc1Ml8xMTQwNzQwODUyCkNvbnRlbnQtdHlwZTogdGV4dC9odG1sOwoJY2hhcnNldD0iVVRGLTgiCkNvbnRlbnQtdHJhbnNmZXItZW5jb2Rpbmc6IHF1b3RlZC1wcmludGFibGUKCjxodG1sIHhtbG5zOnY9M0QidXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTp2bWwiIHhtbG5zOm89M0QidXJuOnNjaGVtYXMtbWljcm9zb2Y9CnQtY29tOm9mZmljZTpvZmZpY2UiIHhtbG5zOnc9M0QidXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTpvZmZpY2U6d29yZCIgeG1sbnM6bT0KPTNEImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vb2ZmaWNlLzIwMDQvMTIvb21tbCIgeG1sbnM6bXY9M0QiaHR0cDovL21hY1ZtbFM9CmNoZW1hVXJpIiB4bWxucz0zRCJodHRwOi8vd3d3LnczLm9yZy9UUi9SRUMtaHRtbDQwIj48aGVhZD48bWV0YSBuYW1lPTNEVGl0bGUgY29uPQp0ZW50PTNEIiI+PG1ldGEgbmFtZT0zREtleXdvcmRzIGNvbnRlbnQ9M0QiIj48bWV0YSBodHRwLWVxdWl2PTNEQ29udGVudC1UeXBlIGNvbnRlbnQ9Cj0zRCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9M0R1dGYtOCI+PG1ldGEgbmFtZT0zRFByb2dJZCBjb250ZW50PTNEV29yZC5Eb2N1bWVudD48bWV0YSBuYT0KbWU9M0RHZW5lcmF0b3IgY29udGVudD0zRCJNaWNyb3NvZnQgV29yZCAxNSI+PG1ldGEgbmFtZT0zRE9yaWdpbmF0b3IgY29udGVudD0zRCJNaWNyPQpvc29mdCBXb3JkIDE1Ij48bGluayByZWw9M0RGaWxlLUxpc3QgaHJlZj0zRCJjaWQ6ZmlsZWxpc3QueG1sQDAxRDMzMTY3LkFGNjdFMzEwIj0KPjwhLS1baWYgZ3RlIG1zbyA5XT48eG1sPgo8bzpPZmZpY2VEb2N1bWVudFNldHRpbmdzPgo8bzpBbGxvd1BORy8+CjxvOlBpeGVsc1BlckluY2g+OTY8L286UGl4ZWxzUGVySW5jaD4KPC9vOk9mZmljZURvY3VtZW50U2V0dGluZ3M+CjwveG1sPjwhW2VuZGlmXS0tPjwhLS1baWYgZ3RlIG1zbyA5XT48eG1sPgo8dzpXb3JkRG9jdW1lbnQ+Cjx3OlNwZWxsaW5nU3RhdGU+Q2xlYW48L3c6U3BlbGxpbmdTdGF0ZT4KPHc6R3JhbW1hclN0YXRlPkNsZWFuPC93OkdyYW1tYXJTdGF0ZT4KPHc6VHJhY2tNb3Zlcy8+Cjx3OlRyYWNrRm9ybWF0dGluZy8+Cjx3OkRvTm90U2hvd1JldmlzaW9ucy8+Cjx3OkRvTm90UHJpbnRSZXZpc2lvbnMvPgo8dzpEb05vdFNob3dNYXJrdXAvPgo8dzpEb05vdFNob3dDb21tZW50cy8+Cjx3OkRvTm90U2hvd0luc2VydGlvbnNBbmREZWxldGlvbnMvPgo8dzpEb05vdFNob3dQcm9wZXJ0eUNoYW5nZXMvPgo8dzpFbnZlbG9wZVZpcy8+Cjx3OlZhbGlkYXRlQWdhaW5zdFNjaGVtYXMvPgo8dzpTYXZlSWZYTUxJbnZhbGlkPmZhbHNlPC93OlNhdmVJZlhNTEludmFsaWQ+Cjx3Oklnbm9yZU1peGVkQ29udGVudD5mYWxzZTwvdzpJZ25vcmVNaXhlZENvbnRlbnQ+Cjx3OkFsd2F5c1Nob3dQbGFjZWhvbGRlclRleHQ+ZmFsc2U8L3c6QWx3YXlzU2hvd1BsYWNlaG9sZGVyVGV4dD4KPHc6RG9Ob3RQcm9tb3RlUUYvPgo8dzpMaWRUaGVtZU90aGVyPkVOLVVTPC93OkxpZFRoZW1lT3RoZXI+Cjx3OkxpZFRoZW1lQXNpYW4+WC1OT05FPC93OkxpZFRoZW1lQXNpYW4+Cjx3OkxpZFRoZW1lQ29tcGxleFNjcmlwdD5YLU5PTkU8L3c6TGlkVGhlbWVDb21wbGV4U2NyaXB0Pgo8dzpDb21wYXRpYmlsaXR5Pgo8dzpEb05vdEV4cGFuZFNoaWZ0UmV0dXJuLz4KPHc6U3BsaXRQZ0JyZWFrQW5kUGFyYU1hcmsvPgo8dzpFbmFibGVPcGVuVHlwZUtlcm5pbmcvPgo8L3c6Q29tcGF0aWJpbGl0eT4KPG06bWF0aFByPgo8bTptYXRoRm9udCBtOnZhbD0zRCJDYW1icmlhIE1hdGgiLz4KPG06YnJrQmluIG06dmFsPTNEImJlZm9yZSIvPgo8bTpicmtCaW5TdWIgbTp2YWw9M0QiJiM0NTstIi8+CjxtOnNtYWxsRnJhYyBtOnZhbD0zRCJvZmYiLz4KPG06ZGlzcERlZi8+CjxtOmxNYXJnaW4gbTp2YWw9M0QiMCIvPgo8bTpyTWFyZ2luIG06dmFsPTNEIjAiLz4KPG06ZGVmSmMgbTp2YWw9M0QiY2VudGVyR3JvdXAiLz4KPG06d3JhcEluZGVudCBtOnZhbD0zRCIxNDQwIi8+CjxtOmludExpbSBtOnZhbD0zRCJzdWJTdXAiLz4KPG06bmFyeUxpbSBtOnZhbD0zRCJ1bmRPdnIiLz4KPC9tOm1hdGhQcj48L3c6V29yZERvY3VtZW50Pgo8L3htbD48IVtlbmRpZl0tLT48c3R5bGU+PCEtLQovKiBGb250IERlZmluaXRpb25zICovCi8qIFN0eWxlIERlZmluaXRpb25zICovCi0tPjwvc3R5bGU+PC9oZWFkPjxib2R5IGJnY29sb3I9M0R3aGl0ZSBsYW5nPTNERU4tVVM+PGRpdiBjbGFzcz0zRFdvcmRTZWN0aW9uMT48cCBjbGFzcz0zRE1zb05vcm1hbD48c3BhbiBzdHlsZT0zRCdmb250LXNpemU6MTEuMHB0Jz4KQ3JlYXRlIGRyYWZ0IHdpdGggc3ViamVjdCBjb250ZW50LWNvbnRlbnQ8bzpwPjwvbzpwPjwvc3Bhbj48L3A+PC9kaXY+PC9ib2R5PjwvaHRtbD4KCi0tQl8zNTg4Njg0NzUyXzExNDA3NDA4NTItLQoK</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090" PropertyType="Integer"/>
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common" PropertyId="34051" PropertyType="Boolean"/>
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
				<SyncState/>
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
		const syncState02Ews = syncMessage.SyncState;

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject1}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const su = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(su, 'Should find message');
		assert.include(su.su, messageSubject1, 'Subject should match');
		const mail02IdWc = su.id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${mail02IdWc}" />
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject1, 'Subject should contain draft subject');
		assert.include(msgObj.fr || '', messageContent1,
			'Content should contain original content');

		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<id>${mail02IdWc}</id>
					<su>${messageSubject1}</su>
					<mp ct="text/plain">
						<content>${messageContent2}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not be a Fault');
		assert.exists(saveDraftRes.SaveDraftResponse, 'SaveDraftResponse should exist');
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
				<SyncState>${syncState02Ews}</SyncState>
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
		const updates = Array.isArray(syncMessage2.Changes.Update)
			? syncMessage2.Changes.Update : [syncMessage2.Changes.Update];
		const mail03Id = updates[0].Message.ItemId.$.Id;
		const mail03ChangeKey = updates[0].Message.ItemId.$.ChangeKey;
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
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mail03Id}" ChangeKey="${mail03ChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject1,
			'Subject should match');
		const body = itemMsg.Items.Message.Body;
		const bodyText = typeof body === 'string' ? body : body._;
		assert.include(bodyText, messageContent2, 'Body should contain modified content');
	});
});
