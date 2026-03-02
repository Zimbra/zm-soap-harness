import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Forward Mail Including Original Mail As Attachment From EWS', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;
	const messageSubject = 'Message test Subject1';
	const messageContent = 'Message test Content1';
	const forwardSubject = 'FW: Message test Subject1';
	const forwardContent = 'Message test Content1 forward original mail as attachment';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsfwdattach1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsfwdattach2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsfwdattach3${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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
	it('Sanity | Send mail from user1 To user2 from ZWC and sync on EWS Then forward same mail to user3 from EWS and include original mail as attachment', async () => {
		// Send mail from account1 to account2 via ZWC
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		await soap.waitFor(8000);

		// EWS: GetFolder inbox for account2
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox>
							<t:EmailAddress>${account2Email}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account2Email, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		assert.equal(folderMsg.Folders.Folder.FolderId.$.Id, '2',
			'Inbox folder Id should be 2');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Inbox',
			'DisplayName should be Inbox');
		const inboxId = folderMsg.Folders.Folder.FolderId.$.Id;

		// EWS: SyncFolderItems to get the mail
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
		assert.exists(matchedItem, "Should find message matching subject");
		const mailItemId = matchedItem.Message.ItemId.$.Id;
		const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

		// EWS: GetItem to verify mail content
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
						<t:FieldURI FieldURI="message:ToRecipients" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account2Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');
		assert.include(itemMsg.Items.Message.Body._, messageContent,
			'Body should contain the message content');
		const toRecipients = Array.isArray(itemMsg.Items.Message.ToRecipients.Mailbox)
			? itemMsg.Items.Message.ToRecipients.Mailbox
			: [itemMsg.Items.Message.ToRecipients.Mailbox];
		assert.equal(toRecipients[0].EmailAddress, account2Email,
			'ToRecipient should match account2');

		// Forward mail from account2 to account3 with original as attachment
		const mimeContent = 'VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4yNi4wLjE3MDkwMgpTdWJqZWN0OiBGVzogTWVzc2FnZSB0ZXN0IFN1YmplY3QxCk1lc3NhZ2UtSUQ6IDwxRjM0RUY0OC05RTA5LTQyRUQtQUVDNC0wQkQxNjgyQ0VGQThAenFhLTI3Ni5lbmcuemltYnJhLmNvbT4KVGhyZWFkLVRvcGljOiBNZXNzYWdlIHRlc3QgU3ViamVjdDEKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiBtdWx0aXBhcnQvbWl4ZWQ7Cglib3VuZGFyeT0iQl8zNTk3NDA3MTA5XzEwMjYyNzUwNTYiCgo+IFRoaXMgbWVzc2FnZSBpcyBpbiBNSU1FIGZvcm1hdC4gU2luY2UgeW91ciBtYWlsIHJlYWRlciBkb2VzIG5vdCB1bmRlcnN0YW5kCnRoaXMgZm9ybWF0LCBzb21lIG9yIGFsbCBvZiB0aGlzIG1lc3NhZ2UgbWF5IG5vdCBiZSBsZWdpYmxlLgoKLS1CXzM1OTc0MDcxMDlfMTAyNjI3NTA1NgpDb250ZW50LXR5cGU6IG11bHRpcGFydC9hbHRlcm5hdGl2ZTsKCWJvdW5kYXJ5PSJCXzM1OTc0MDcxMDlfMzY3NTAzNTUxIgoKCi0tQl8zNTk3NDA3MTA5XzM2NzUwMzU1MQpDb250ZW50LXR5cGU6IHRleHQvcGxhaW47CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogN2JpdAoKTWVzc2FnZSB0ZXN0IENvbnRlbnQxIGZvcndhcmQgb3JpZ2luYWwgbWFpbCBhcyBhdHRhY2htZW50CgoKLS1CXzM1OTc0MDcxMDlfMzY3NTAzNTUxCkNvbnRlbnQtdHlwZTogdGV4dC9odG1sOwoJY2hhcnNldD0iVVRGLTgiCkNvbnRlbnQtdHJhbnNmZXItZW5jb2Rpbmc6IHF1b3RlZC1wcmludGFibGUKCjxodG1sIHhtbG5zOm89M0QidXJuOnNjaGVtYXMtbWljcm9zb2Z0LWNvbTpvZmZpY2U6b2ZmaWNlIiB4bWxuczp3PTNEInVybjpzY2hlbWE9CnMtbWljcm9zb2Z0LWNvbTpvZmZpY2U6d29yZCIgeG1sbnM6bT0zRCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL29mZmljZS8yMD0KMDQvMTIvb21tbCIgeG1sbnM9M0QiaHR0cDovL3d3dy53My5vcmcvVFIvUkVDLWh0bWw0MCI+PGhlYWQ+PG1ldGEgbmFtZT0zRFRpdGxlIGM9Cm9udGVudD0zRCIiPjxtZXRhIG5hbWU9M0RLZXl3b3JkcyBjb250ZW50PTNEIiI+PG1ldGEgaHR0cC1lcXVpdj0zRENvbnRlbnQtVHlwZSBjb250ZT0KbnQ9M0QidGV4dC9odG1sOyBjaGFyc2V0PTNEdXRmLTgiPjxtZXRhIG5hbWU9M0RHZW5lcmF0b3IgY29udGVudD0zRCJNaWNyb3NvZnQgV29yZCAxPQo1IChmaWx0ZXJlZCBtZWRpdW0pIj48c3R5bGU+PCEtLQovKiBGb250IERlZmluaXRpb25zICovCkBmb250LWZhY2UKCXtmb250LWZhbWlseToiQ2FtYnJpYSBNYXRoIjsKCXBhbm9zZS0xOjAgMCAwIDAgMCAwIDAgMCAwIDA7fQpAZm9udC1mYWNlCgl7Zm9udC1mYW1pbHk6Q2FsaWJyaTsKCXBhbm9zZS0xOjIgMTUgNSAyIDIgMiA0IDMgMiA0O30KLyogU3R5bGUgRGVmaW5pdGlvbnMgKi8KcC5Nc29Ob3JtYWwsIGxpLk1zb05vcm1hbCwgZGl2Lk1zb05vcm1hbAoJe21hcmdpbjowY207CgltYXJnaW4tYm90dG9tOi4wMDAxcHQ7Cglmb250LXNpemU6MTIuMHB0OwoJZm9udC1mYW1pbHk6IkNhbGlicmkiLHNhbnMtc2VyaWY7fQphOmxpbmssIHNwYW4uTXNvSHlwZXJsaW5rCgl7bXNvLXN0eWxlLXByaW9yaXR5Ojk5OwoJY29sb3I6IzA1NjNDMTsKCXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7fQphOnZpc2l0ZWQsIHNwYW4uTXNvSHlwZXJsaW5rRm9sbG93ZWQKCXttc28tc3R5bGUtcHJpb3JpdHk6OTk7Cgljb2xvcjojOTU0RjcyOwoJdGV4dC1kZWNvcmF0aW9uOnVuZGVybGluZTt9CnNwYW4uRW1haWxTdHlsZTE3Cgl7bXNvLXN0eWxlLXR5cGU6cGVyc29uYWwtY29tcG9zZTsKCWZvbnQtZmFtaWx5OiJDYWxpYnJpIixzYW5zLXNlcmlmOwoJY29sb3I6d2luZG93dGV4dDt9CnNwYW4ubXNvSW5zCgl7bXNvLXN0eWxlLXR5cGU6ZXhwb3J0LW9ubHk7Cgltc28tc3R5bGUtbmFtZToiIjsKCXRleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7Cgljb2xvcjp0ZWFsO30KLk1zb0NocERlZmF1bHQKCXttc28tc3R5bGUtdHlwZTpleHBvcnQtb25seTsKCWZvbnQtZmFtaWx5OiJDYWxpYnJpIixzYW5zLXNlcmlmO30KQHBhZ2UgV29yZFNlY3Rpb24xCgl7c2l6ZTo1OTUuMHB0IDg0Mi4wcHQ7CgltYXJnaW46NzIuMHB0IDcyLjBwdCA3Mi4wcHQgNzIuMHB0O30KZGl2LldvcmRTZWN0aW9uMQoJe3BhZ2U6V29yZFNlY3Rpb24xO30KLS0+PC9zdHlsZT48L2hlYWQ+PGJvZHkgYmdjb2xvcj0zRHdoaXRlIGxhbmc9M0RFTi1VUyBsaW5rPTNEIiMwNTYzQzEiIHZsaW5rPTNEIiM5NTQ9CkY3MiI+PGRpdiBjbGFzcz0zRFdvcmRTZWN0aW9uMT48cCBjbGFzcz0zRE1zb05vcm1hbD48c3BhbiBzdHlsZT0zRCdmb250LXNpemU6MTEuMHA9CnQnPk1lc3NhZ2UgdGVzdCBDb250ZW50MSBmb3J3YXJkIG9yaWdpbmFsIG1haWwgYXMgYXR0YWNobWVudDxvOnA+PC9vOnA+PC9zcGE9Cm4+PC9wPjwvZGl2PjwvYm9keT48L2h0bWw+CgotLUJfMzU5NzQwNzEwOV8zNjc1MDM1NTEtLQoKCi0tQl8zNTk3NDA3MTA5XzEwMjYyNzUwNTYKQ29udGVudC10eXBlOiBtZXNzYWdlL3JmYzgyMgpDb250ZW50LWRpc3Bvc2l0aW9uOiBhdHRhY2htZW50CgpTdWJqZWN0OiBNZXNzYWdlIHRlc3QgU3ViamVjdDEKTWVzc2FnZS1JRDogPDE2MDM3NTI4MjUuNTY4LjE1MTQ1MTM4ODcwNzAuSmF2YU1haWwuemltYnJhQHpxYS0yNzYuZW5nLnppbWJyYS5jb20+ClRocmVhZC1Ub3BpYzogTWVzc2FnZSB0ZXN0IFN1YmplY3QxCk1pbWUtdmVyc2lvbjogMS4wCkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiA3Yml0CgpNZXNzYWdlIHRlc3QgQ29udGVudDEKCgotLUJfMzU5NzQwNzEwOV8xMDI2Mjc1MDU2LS0KCg==';

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mimeContent}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account3Email}</t:Name>
								<t:EmailAddress>${account3Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account2Email}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account2Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'Forward CreateItem should succeed');

		// Sync sent folder on EWS for account1
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncSentBody = ews.getBody(syncSentRes);
		const syncSentMsg = syncSentBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSentMessage = Array.isArray(syncSentMsg)
			? syncSentMsg[0] : syncSentMsg;
		assert.equal(syncSentMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// Verify on ZWC: account3 received the forwarded mail with attachment
		await soap.waitFor(8000);
		const account3AuthToken = await soap.getAccountAuthToken(
			account3Email, accountPassword
		);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:"${forwardSubject}"</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
		assert.equal(hit.su, forwardSubject, 'Subject should match forwarded subject');
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		// GetMsg to verify from/to and attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, account3AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		const emailAddrs = Array.isArray(msgObj.e) ? msgObj.e : [msgObj.e];
		const fromAddr = emailAddrs.find(e => e.t === 'f');
		assert.exists(fromAddr, 'From address should exist');
		assert.equal(fromAddr.a, account2Email, 'From should be account2');
		const toAddr = emailAddrs.find(e => e.t === 't');
		assert.exists(toAddr, 'To address should exist');
		assert.equal(toAddr.a, account3Email, 'To should be account3');

		// Verify attachment exists
		const mp = Array.isArray(msgObj.mp) ? msgObj.mp : [msgObj.mp];
		const hasAttachment = mp.some(p => p.cd === 'attachment') ||
			JSON.stringify(mp).includes('"cd":"attachment"');
		assert.isTrue(hasAttachment, 'Mail should have attachment');
	});
});
