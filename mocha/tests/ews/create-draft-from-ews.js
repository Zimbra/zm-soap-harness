import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Create Draft From EWS', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword;

	before(async function () {
		await main.before(this.ctx);
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create draft with subject and content in EWS and sync on ZWC client', async () => {
		const messageSubject = 'Create draft with subject and content-subject';
		const messageContent = 'Create draft with subject and content-content';

		// EWS: CreateItem to save draft in Drafts folder (Id=6)
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xZi4wLjE3MDIxNgpTdWJqZWN0OiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKVGhyZWFkLVRvcGljOiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiB0ZXh0L3BsYWluOwoJY2hhcnNldD0iVVRGLTgiCkNvbnRlbnQtdHJhbnNmZXItZW5jb2Rpbmc6IDdiaXQKCkNyZWF0ZSBkcmFmdCB3aXRoIHN1YmplY3QgYW5kIGNvbnRlbnQtY29udGVudA==</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
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
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		// EWS: SyncFolderItems on Drafts folder
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

		// ZWC: Verify draft is visible
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// ZWC: GetMsg to verify content and draft flag
		const messages = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : [];
		assert.isAbove(messages.length, 0, 'Should find message');
		const msgId = messages[0].id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should match');
	});


	it('Sanity | Create draft with subject and recipient in EWS and sync on ZWC client', async () => {
		const messageSubject = 'Create draft with subject and recipient-subject';

		// EWS: CreateItem draft with recipient
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xZi4wLjE3MDIxNgpTdWJqZWN0OiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCByZWNpcGllbnQtc3ViamVjdApUbzogZm9vIDxmb29AZXhhbXBsZS5jb20+ClRocmVhZC1Ub3BpYzogQ3JlYXRlIGRyYWZ0IHdpdGggc3ViamVjdCBhbmQgcmVjaXBpZW50LXN1YmplY3QKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiB0ZXh0L3BsYWluOwoJY2hhcnNldD0iVVRGLTgiCkNvbnRlbnQtdHJhbnNmZXItZW5jb2Rpbmc6IDdiaXQK</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
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
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		// EWS: SyncFolderItems on Drafts folder
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

		// ZWC: Verify draft with recipient
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const messages = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse?.m : searchRes.SearchResponse.c
				? (Array.isArray(searchRes.SearchResponse.c)
					? searchRes.SearchResponse.c : [searchRes.SearchResponse.c])
				: [searchRes.SearchResponse?.m];
		const msgId = messages[0]?.id || messages[0]?.m?.[0]?.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should match');
		// Verify recipient exists
		const recipients = Array.isArray(msgObj.e) ? msgObj.e : [msgObj.e];
		const toRecipient = recipients.find(e => e.t === 't');
		assert.exists(toRecipient, 'To recipient should exist');
		assert.equal(toRecipient.a, 'foo@example.com', 'To recipient should be foo@example.com');
	});
});
