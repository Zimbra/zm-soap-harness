import { assert } from "chai";
import config from "../../conf/config.js";
import common from "../../framework/core/common.js";
import soap from "../../framework/backend/soap-client.js";
import ews from "../../framework/backend/ews.js";
import { main } from "../../pages/main.js";

describe("EWS > Send Mail", function () {
	this.timeout(300 * 1000);
	let adminAuthToken,
		account1Email,
		account2Email,
		account1AuthToken,
		account2AuthToken,
		accountPassword;
	const messageSubject = `subject${common.getUniqueString()}`;
	const messageSubject1 = `subject1${common.getUniqueString()}`;
	const messageSubject3 = `subject3${common.getUniqueString()}`;
	const messageSubject5 = `subject5${common.getUniqueString()}`;
	const messageSubject6 = `subject6${common.getUniqueString()}`;
	const messageSubject7 = `subject7${common.getUniqueString()}`;
	const messageSubject8 = `subject8${common.getUniqueString()}`;
	const messageSubject9 = `subject9${common.getUniqueString()}`;
	const messageSubject10 = "go man";
	const messageSubject11 = "html mail test1";
	const messageSubject12 = "html with attachment test 1";
	const messageSubject13 = "high priority mail";
	const messageSubject14 = "low priority mail";
	const messageSubject15 = `subject15${common.getUniqueString()}`;
	const messageSubject16 = `subject16${common.getUniqueString()}`;
	const messageContent = "Message test content";
	const htmlContent =
		"&lt;html&gt;&lt;body&gt;&lt;div style=\\'font-family: arial, helvetica, sans-serif; font-size: 12pt; color: #000000\\'&gt;&lt;div&gt;&lt;em&gt;&lt;strong&gt;asdasd&lt;/strong&gt;&lt;/em&gt;&lt;br data-mce-bogus=\\'1\\'&gt;&lt;/div&gt;&lt;/div&gt;&lt;/body&gt;&lt;/html&gt; ";

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = "test123";

		account1Email = `ewssm1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);

		account2Email = `ewssm2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);

		account1AuthToken = await soap.getAccountAuthToken(
			account1Email,
			accountPassword,
		);
		account2AuthToken = await soap.getAccountAuthToken(
			account2Email,
			accountPassword,
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

	// Helper: Send mail from ZWC (account2) to EWS (account1) and verify via EWS GetItem
	async function sendFromZwcAndVerifyOnEws(
		subject,
		content,
		contentType,
		prevSyncState,
		additionalVerify,
	) {
		// ZWC: Send mail
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${subject}</su>
					<mp ct="${contentType}">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		// EWS: GetFolder inbox
		const folderRes = await ews.makeEWSRequest(
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
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		assert.equal(
			folderMessage.$.ResponseClass,
			"Success",
			"GetFolder should succeed",
		);
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		// EWS: SyncFolderItems
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${inboxId}" />
				</SyncFolderId>
				${prevSyncState ? `<SyncState>${prevSyncState}</SyncState>` : "<SyncState />"}
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(
			syncMessage.$.ResponseClass,
			"Success",
			"SyncFolderItems should succeed",
		);
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;
		const newSyncState = syncMessage.SyncState;

		// EWS: GetItem
		const getRes = await ews.makeEWSRequest(
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
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:HasAttachments" />
						<t:FieldURI FieldURI="item:Importance" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			subject,
			"Subject should match",
		);

		if (additionalVerify) {
			additionalVerify(getMessage);
		}

		return newSyncState;
	}

	// Tests
	it("Sanity | Send plain text mail from zwc to ews client", async () => {
		await sendFromZwcAndVerifyOnEws(
			messageSubject,
			messageContent,
			"text/plain",
			null,
			(msg) => {
				assert.include(
					msg.Items.Message.Body._,
					messageContent,
					"Body should contain content",
				);
			},
		);
	});

	it("Sanity | Send html text mail from zwc to ews client", async () => {
		await sendFromZwcAndVerifyOnEws(
			messageSubject1,
			htmlContent,
			"text/html",
			null,
			(msg) => {
				assert.equal(
					msg.Items.Message.Body.$.BodyType,
					"HTML",
					"Body type should be HTML",
				);
			},
		);
	});

	it("Sanity | Send an html mail with attachment from ZWC to EWS client", async () => {
		// ZWC: Upload file and send with attachment
		const uploadRes = await soap.uploadFile(
			account2AuthToken,
			"data/ews/image1.jpg",
		);
		const uploadAid = uploadRes.aid;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject3}</su>
					<mp ct="text/html">
						<content>Message 3 test content</content>
					</mp>
					<attach aid="${uploadAid}" />
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		// EWS: GetFolder inbox
		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		// EWS: SyncFolderItems
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		// EWS: GetItem with attachment fields
		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject3,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Body.$.BodyType,
			"HTML",
			"Body type should be HTML",
		);
		assert.equal(
			getMessage.Items.Message.HasAttachments,
			"true",
			"HasAttachments should be true",
		);
		const attachments = getMessage.Items.Message.Attachments.FileAttachment;
		const attachment = Array.isArray(attachments)
			? attachments[0]
			: attachments;
		assert.equal(
			attachment.ContentType,
			"image/jpeg",
			"ContentType should be image/jpeg",
		);
		assert.equal(
			attachment.Name,
			"image1.jpg",
			"Attachment name should be image1.jpg",
		);
	});

	it("Sanity | Send an html mail with png attachment from zwc to ews client", async () => {
		// ZWC: Upload png file and send with attachment
		const uploadRes = await soap.uploadFile(
			account2AuthToken,
			"data/ews/image2.png",
		);
		const uploadAid = uploadRes.aid;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject5}</su>
					<mp ct="text/html">
						<content>Message 5 test content</content>
					</mp>
					<attach aid="${uploadAid}" />
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		// EWS: Verify via sendFromZwcAndVerifyOnEws helper pattern
		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject5,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Body.$.BodyType,
			"HTML",
			"Body type should be HTML",
		);
		assert.equal(
			getMessage.Items.Message.HasAttachments,
			"true",
			"HasAttachments should be true",
		);
		const attachments5 = getMessage.Items.Message.Attachments.FileAttachment;
		const attachment5 = Array.isArray(attachments5)
			? attachments5[0]
			: attachments5;
		assert.equal(
			attachment5.ContentType,
			"image/png",
			"ContentType should be image/png",
		);
		assert.equal(
			attachment5.Name,
			"image2.png",
			"Attachment name should be image2.png",
		);
	});

	it("Sanity | Send an html mail with bmp attachment from zwc to ews client", async () => {
		// ZWC: Upload bmp file and send with attachment
		const uploadRes = await soap.uploadFile(
			account2AuthToken,
			"data/ews/image3.bmp",
		);
		const uploadAid = uploadRes.aid;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject6}</su>
					<mp ct="text/html">
						<content>Message 6 test content</content>
					</mp>
					<attach aid="${uploadAid}" />
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject6,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Body.$.BodyType,
			"HTML",
			"Body type should be HTML",
		);
		assert.equal(
			getMessage.Items.Message.HasAttachments,
			"true",
			"HasAttachments should be true",
		);
		const attachments6 = getMessage.Items.Message.Attachments.FileAttachment;
		const attachment6 = Array.isArray(attachments6)
			? attachments6[0]
			: attachments6;
		assert.equal(
			attachment6.ContentType,
			"image/bmp",
			"ContentType should be image/bmp",
		);
		assert.equal(
			attachment6.Name,
			"image3.bmp",
			"Attachment name should be image3.bmp",
		);
	});

	it("Sanity | Send an html mail with pdf attachment from zwc to ews client", async () => {
		// ZWC: Upload pdf file and send with attachment
		const uploadRes = await soap.uploadFile(
			account2AuthToken,
			"data/ews/file1.pdf",
		);
		const uploadAid = uploadRes.aid;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject7}</su>
					<mp ct="text/html">
						<content>Message 7 test content</content>
					</mp>
					<attach aid="${uploadAid}" />
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject7,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Body.$.BodyType,
			"HTML",
			"Body type should be HTML",
		);
		assert.equal(
			getMessage.Items.Message.HasAttachments,
			"true",
			"HasAttachments should be true",
		);
		const attachments7 = getMessage.Items.Message.Attachments.FileAttachment;
		const attachment7 = Array.isArray(attachments7)
			? attachments7[0]
			: attachments7;
		assert.equal(
			attachment7.ContentType,
			"application/pdf",
			"ContentType should be application/pdf",
		);
		assert.equal(
			attachment7.Name,
			"file1.pdf",
			"Attachment name should be file1.pdf",
		);
	});

	it("Sanity | Send an html mail with inline attachment from zwc to ews client", async () => {
		// ZWC: Upload file for inline and send with inline attachment
		const uploadRes = await soap.uploadFile(
			account2AuthToken,
			"data/ews/image1.jpg",
		);
		const uploadAid = uploadRes.aid;
		const cidValue = `${common.getUniqueString()}@zimbra`;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject8}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>Message 8 inline test content</content>
						</mp>
						<mp ct="multipart/related">
							<mp ct="text/html">
								<content>&lt;html&gt;&lt;body&gt;&lt;P&gt;Text before image.&lt;/P&gt;&lt;P&gt;&lt;IMG src="cid:${cidValue}"&gt;&lt;/IMG&gt;Text after image.&lt;/P&gt;&lt;/body&gt;&lt;/html&gt;</content>
							</mp>
							<mp ci="${cidValue}">
								<attach aid="${uploadAid}" />
							</mp>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject8,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Body.$.BodyType,
			"HTML",
			"Body type should be HTML",
		);
		assert.equal(
			getMessage.Items.Message.HasAttachments,
			"true",
			"HasAttachments should be true",
		);
		const attachments8 = getMessage.Items.Message.Attachments.FileAttachment;
		const attachment8 = Array.isArray(attachments8)
			? attachments8[0]
			: attachments8;
		assert.equal(
			attachment8.ContentType,
			"image/jpeg",
			"ContentType should be image/jpeg",
		);
		assert.equal(
			attachment8.Name,
			"image1.jpg",
			"Attachment name should be image1.jpg",
		);
		assert.equal(attachment8.IsInline, "true", "IsInline should be true");
	});

	it("Sanity | Send an html mail with png inline attachment from zwc to ews client", async () => {
		// ZWC: Upload png file for inline and send with inline attachment
		const uploadRes = await soap.uploadFile(
			account2AuthToken,
			"data/ews/image2.png",
		);
		const uploadAid = uploadRes.aid;
		const cidValue = `${common.getUniqueString()}@zimbra`;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" />
					<su>${messageSubject9}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>Message 9 inline test content</content>
						</mp>
						<mp ct="multipart/related">
							<mp ct="text/html">
								<content>&lt;html&gt;&lt;body&gt;&lt;P&gt;Text before image.&lt;/P&gt;&lt;P&gt;&lt;IMG src="cid:${cidValue}"&gt;&lt;/IMG&gt;Text after image.&lt;/P&gt;&lt;/body&gt;&lt;/html&gt;</content>
							</mp>
							<mp ci="${cidValue}">
								<attach aid="${uploadAid}" />
							</mp>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:HasAttachments" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject9,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Body.$.BodyType,
			"HTML",
			"Body type should be HTML",
		);
		assert.equal(
			getMessage.Items.Message.HasAttachments,
			"true",
			"HasAttachments should be true",
		);
		const attachments9 = getMessage.Items.Message.Attachments.FileAttachment;
		const attachment9 = Array.isArray(attachments9)
			? attachments9[0]
			: attachments9;
		assert.equal(
			attachment9.ContentType,
			"image/png",
			"ContentType should be image/png",
		);
		assert.equal(
			attachment9.Name,
			"image2.png",
			"Attachment name should be image2.png",
		);
		assert.equal(attachment9.IsInline, "true", "IsInline should be true");
	});

	it("Sanity | Send an html mail with attachment from EWS to ZWC client", async () => {
		// EWS: CreateItem with MIME content (contains base64 encoded email with attachment)
		const account1Username = account1Email.split("@")[0];
		const account2Username = account2Email.split("@")[0];
		const mailMime = Buffer.from(
			"User-Agent: Microsoft-MacOutlook/f.16.0.160506\r\n" +
			"Date: Tue, 20 Dec 2016 22:32:13 +0530\r\n" +
			"Subject: dd\r\n" +
			"Mime-version: 1.0\r\n" +
			"Content-type: text/plain;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"ddd\r\n",
		).toString("base64");

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mailMime}</t:MimeContent>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values>
								<t:Value>:R:0</t:Value>
							</t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(
			createMessage.$.ResponseClass,
			"Success",
			"CreateItem should succeed",
		);
	});

	it("Sanity | Send a mail from ews to zwc client", async () => {
		// EWS: CreateItem with plain text MIME
		const account1Username = account1Email.split("@")[0];
		const account2Username = account2Email.split("@")[0];
		const mailMime = Buffer.from(
			"User-Agent: Microsoft-MacOutlook/f.16.0.160506\r\n" +
			"Date: Thu, 05 Jan 2017 17:48:23 +0530\r\n" +
			`Subject: ${messageSubject10}\r\n` +
			"Mime-version: 1.0\r\n" +
			"Content-type: text/plain;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"asdasdasdad\r\n",
		).toString("base64");

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId><t:FolderId Id="5" /></SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mailMime}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values><t:Value>:R:0</t:Value></t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(
			createMessage.$.ResponseClass,
			"Success",
			"CreateItem should succeed",
		);

		// Verify on ZWC: account2 received the mail
		await soap.waitFor(5000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject10}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes.Fault, "SearchRequest should not fault");
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0]
			: searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject10, "Subject should match");
	});

	it("Sanity | Send a html mail from ews to zwc client", async () => {
		const account1Username = account1Email.split("@")[0];
		const account2Username = account2Email.split("@")[0];
		const mailMime = Buffer.from(
			"User-Agent: Microsoft-MacOutlook/f.16.0.160506\r\n" +
			"Date: Sun, 08 Jan 2017 14:20:23 +0530\r\n" +
			`Subject: ${messageSubject11}\r\n` +
			"Mime-version: 1.0\r\n" +
			"Content-type: multipart/alternative;\r\n" +
			'\tboundary="B_3566730023_1555584937"\r\n' +
			"\r\n" +
			"--B_3566730023_1555584937\r\n" +
			"Content-type: text/plain;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"This is html mail test\r\n" +
			"\r\n" +
			"--B_3566730023_1555584937\r\n" +
			"Content-type: text/html;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"<html><body><b>This is html mail test</b></body></html>\r\n" +
			"\r\n" +
			"--B_3566730023_1555584937--\r\n",
		).toString("base64");

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId><t:FolderId Id="5" /></SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mailMime}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values><t:Value>:R:0</t:Value></t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(
			createMessage.$.ResponseClass,
			"Success",
			"CreateItem should succeed",
		);

		// Verify on ZWC: account2 received the html mail
		await soap.waitFor(5000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject11}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes.Fault, "SearchRequest should not fault");
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0]
			: searchRes.SearchResponse.c;
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(getMsgRes.Fault, "GetMsgRequest should not fault");
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		const mp = msgObj.mp;
		const mpArr = Array.isArray(mp) ? mp : [mp];
		const hasHtml = JSON.stringify(mpArr).includes("text/html");
		assert.isTrue(hasHtml, "Message should contain text/html content type");
	});

	it("Sanity | Send a html mail with attachment from ews to zwc client", async () => {
		const account1Username = account1Email.split("@")[0];
		const account2Username = account2Email.split("@")[0];
		const mailMime = Buffer.from(
			"User-Agent: Microsoft-MacOutlook/f.16.0.160506\r\n" +
			"Date: Sun, 08 Jan 2017 14:51:43 +0530\r\n" +
			`Subject: ${messageSubject12}\r\n` +
			"Mime-version: 1.0\r\n" +
			"Content-type: multipart/mixed;\r\n" +
			'\tboundary="B_3566731903_1383385602"\r\n' +
			"\r\n" +
			"--B_3566731903_1383385602\r\n" +
			"Content-type: text/html;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"<html><body>Test mail with attachment</body></html>\r\n" +
			"\r\n" +
			"--B_3566731903_1383385602\r\n" +
			'Content-type: image/png; name="notification_icon.png"\r\n' +
			"Content-disposition: attachment;\r\n" +
			'\tfilename="notification_icon.png"\r\n' +
			"Content-transfer-encoding: base64\r\n" +
			"\r\n" +
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==\r\n" +
			"\r\n" +
			"--B_3566731903_1383385602--\r\n",
		).toString("base64");

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId><t:FolderId Id="5" /></SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mailMime}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values><t:Value>:R:0</t:Value></t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(
			createMessage.$.ResponseClass,
			"Success",
			"CreateItem should succeed",
		);

		// Verify on ZWC: account2 received the html mail with attachment
		await soap.waitFor(5000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject12}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes.Fault, "SearchRequest should not fault");
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0]
			: searchRes.SearchResponse.c;
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(getMsgRes.Fault, "GetMsgRequest should not fault");
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		const mpStr = JSON.stringify(msgObj.mp);
		assert.include(
			mpStr,
			"text/html",
			"Message should contain text/html content type",
		);
		assert.include(
			mpStr,
			"image/png",
			"Message should contain image/png attachment",
		);
		assert.include(
			mpStr,
			"attachment",
			"Message should have attachment disposition",
		);
	});

	it("Sanity | Send a high priority mail from ews to zwc client", async () => {
		const account1Username = account1Email.split("@")[0];
		const account2Username = account2Email.split("@")[0];
		const mailMime = Buffer.from(
			"User-Agent: Microsoft-MacOutlook/f.16.0.160506\r\n" +
			"Date: Sun, 08 Jan 2017 15:29:13 +0530\r\n" +
			`Subject: ${messageSubject13}\r\n` +
			"X-Priority: 2\r\n" +
			"Mime-version: 1.0\r\n" +
			"Content-type: text/plain;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"Mail with high priority\r\n",
		).toString("base64");

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId><t:FolderId Id="5" /></SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mailMime}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>High</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values><t:Value>:R:0</t:Value></t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(
			createMessage.$.ResponseClass,
			"Success",
			"CreateItem should succeed",
		);

		// Verify on ZWC: account2 received high priority mail
		await soap.waitFor(5000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject13}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes.Fault, "SearchRequest should not fault");
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0]
			: searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject13, "Subject should match");
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(getMsgRes.Fault, "GetMsgRequest should not fault");
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.f, "!", "Flag should indicate high priority");
	});

	it("Sanity | Send a low priority mail from ews to zwc client", async () => {
		const account1Username = account1Email.split("@")[0];
		const account2Username = account2Email.split("@")[0];
		const mailMime = Buffer.from(
			"User-Agent: Microsoft-MacOutlook/f.16.0.160506\r\n" +
			"Date: Sun, 08 Jan 2017 15:55:11 +0530\r\n" +
			`Subject: ${messageSubject14}\r\n` +
			"X-Priority: 4\r\n" +
			"Mime-version: 1.0\r\n" +
			"Content-type: text/plain;\r\n" +
			'\tcharset="UTF-8"\r\n' +
			"Content-transfer-encoding: 7bit\r\n" +
			"\r\n" +
			"Mail with low priority\r\n",
		).toString("base64");

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId><t:FolderId Id="5" /></SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">${mailMime}</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Low</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07" PropertyType="Integer" />
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F" PropertyType="StringArray" />
							<t:Values><t:Value>:R:0</t:Value></t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:Name>${account2Username}</t:Name>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
								<t:Name>${account1Username}</t:Name>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(
			createMessage.$.ResponseClass,
			"Success",
			"CreateItem should succeed",
		);

		// Verify on ZWC: account2 received low priority mail
		await soap.waitFor(5000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject14}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes.Fault, "SearchRequest should not fault");
		const hit = Array.isArray(searchRes.SearchResponse.c)
			? searchRes.SearchResponse.c[0]
			: searchRes.SearchResponse.c;
		assert.equal(hit.su, messageSubject14, "Subject should match");
		const msgId = Array.isArray(hit.m) ? hit.m[0].id : hit.m.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(getMsgRes.Fault, "GetMsgRequest should not fault");
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.f, "?", "Flag should indicate low priority");
	});

	it("Sanity | Send high priority mail from zwc to ews client", async () => {
		// ZWC: Send high priority mail
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m f="!">
					<e t="t" a="${account1Email}" />
					<su>${messageSubject15}</su>
					<mp ct="text/plain">
						<content>Message 15 test content</content>
					</mp>
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		// EWS: Verify importance is High
		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:Importance" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject15,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Importance,
			"High",
			"Importance should be High",
		);
	});

	it("Sanity | Send low priority mail from zwc to ews client", async () => {
		// ZWC: Send low priority mail
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m f="?">
					<e t="t" a="${account1Email}" />
					<su>${messageSubject16}</su>
					<mp ct="text/plain">
						<content>Message 16 test content</content>
					</mp>
				</m>
			</SendMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(sendRes.Fault, "SendMsgRequest should not fault");

		// EWS: Verify importance is Low
		const folderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape><t:BaseShape>AllProperties</t:BaseShape></FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="inbox">
						<t:Mailbox><t:EmailAddress>${account1Email}</t:EmailAddress></t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			account1Email,
			accountPassword,
		);
		const folderBody = ews.getBody(folderRes);
		const folderMsg =
			folderBody.GetFolderResponse.ResponseMessages.GetFolderResponseMessage;
		const folderMessage = Array.isArray(folderMsg) ? folderMsg[0] : folderMsg;
		const inboxId = folderMessage.Folders.Folder.FolderId.$.Id;

		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape><t:BaseShape>IdOnly</t:BaseShape></ItemShape>
				<SyncFolderId><t:FolderId Id="${inboxId}" /></SyncFolderId>
				<SyncState /><Ignore /><MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		const creates = syncMessage.Changes.Create;
		const createArr = Array.isArray(creates) ? creates : [creates];
		const lastCreate = createArr[createArr.length - 1];
		const mailId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;

		const getRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:Importance" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getBody = ews.getBody(getRes);
		const getMsg =
			getBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		const getMessage = Array.isArray(getMsg) ? getMsg[0] : getMsg;
		assert.equal(
			getMessage.$.ResponseClass,
			"Success",
			"GetItem should succeed",
		);
		assert.equal(
			getMessage.Items.Message.Subject,
			messageSubject16,
			"Subject should match",
		);
		assert.equal(
			getMessage.Items.Message.Importance,
			"Low",
			"Importance should be Low",
		);
	});
});
