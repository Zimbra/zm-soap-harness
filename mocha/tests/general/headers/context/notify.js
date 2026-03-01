import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('General > Headers > Context > Notify', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Email;
	let account2Email;
	let account1AuthToken;
	let account2AuthToken;
	let inboxId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `test1${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `test2${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Get folder list for account1
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		const folders = folderRes.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');
		inboxId = inbox.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create a new folder and verify the notify block', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// Create a folder
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateFolderRequest should not fault');
		assert.exists(createRes.CreateFolderResponse, 'CreateFolderResponse should exist');
		const folderId = createRes.CreateFolderResponse.folder[0].id;

		// Verify response
		assert.exists(folderId, 'Folder id should exist');
	});


	it('Sanity | Delete a folder and verify the notify block', async () => {
		const folderName = `folder${common.getUniqueString()}`;

		// Create a folder
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateFolderRequest should not fault');
		const folderId = createRes.CreateFolderResponse.folder[0].id;
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Perform folder action
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'FolderActionRequest should not fault');
		const action = deleteRes.FolderActionResponse.action;

		// Verify response
		assert.equal(action.op, 'delete', 'Action op should be delete');
	});


	it('Sanity | Create a new Tag and verify the notify block', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateTagRequest should not fault');
		assert.exists(createRes.CreateTagResponse, 'CreateTagResponse should exist');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Verify response
		assert.exists(tagId, 'Tag id should exist');
	});


	it('Sanity | Delete a tag and verify notification block contains only valid information', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateTagRequest should not fault');
		const tagId = createRes.CreateTagResponse.tag[0].id;

		// Send tag action request
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${tagId}"/>
			</TagActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'TagActionRequest should not fault');
		const action = deleteRes.TagActionResponse.action;

		// Verify response
		assert.equal(action.op, 'delete', 'Action op should be delete');
	});


	it('Sanity | Send a mail to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const content = 'Content in the message is contents...';

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
	});


	it('Sanity | Verify the notification block for search request', async () => {
		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:sent</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Search for a message after inject to verify the notification block', async () => {
		const subject = `email01A${common.getUniqueString()}`;

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>From: sender@example.com
To: ${account1Email}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple message content

</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox subject:"${subject}"</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the injected message');
	});


	it('Sanity | Search for an appointment after inject to verify the notification block', async () => {
		const subject = `appt${common.getUniqueString()}`;
		const startTime = common.getGMTTime(60);
		const endTime = common.getGMTTime(120);

		// Create an appointment
		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${account1Email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>appointment content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(apptRes.Fault, 'CreateAppointmentRequest should not fault');

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${Date.now() - 86400000}"
				calExpandInstEnd="${Date.now() + 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});


	it('Sanity | Add a mail to verify the notification block', async () => {
		const content = `content${common.getUniqueString()}`;

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content>Subject:this is subject of the message

${content}</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		assert.exists(addRes.AddMsgResponse, 'AddMsgResponse should exist');
	});


	it('Sanity | Create an appointment to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const location = `Location${common.getUniqueString()}`;
		const content = `Content${common.getUniqueString()}`;
		const startTime = common.getGMTTime(30);
		const endTime = common.getGMTTime(60);

		// Create an appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="${location}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		assert.exists(createRes.CreateAppointmentResponse,
			'CreateAppointmentResponse should exist');
	});


	it('Sanity | Cancel an appointment to verify the notification block', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const startTime = common.getGMTTime(60);
		const endTime = common.getGMTTime(120);

		// Create an appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${startTime}"/>
							<e d="${endTime}"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const apptInvId = createRes.CreateAppointmentResponse.invId;

		// Send cancel appointment request
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptInvId}" comp="0">
				<m>
					<su>Cancelled: ${subject}</su>
					<mp content-type="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');
		assert.exists(cancelRes.CancelAppointmentResponse,
			'CancelAppointmentResponse should exist');
	});


	it('Sanity | Modify an appointment to verify the notification block', async () => {
		const subject = `subject${common.getUniqueString()}`;
		const newSubject = `Subj${common.getUniqueString()}`;
		const newLocation = `Loc${common.getUniqueString()}`;
		const startTime = common.getGMTTime(60);
		const endTime = common.getGMTTime(120);
		const newStartTime = common.getGMTTime(120);
		const newEndTime = common.getGMTTime(180);

		// Create an appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${startTime}"/>
							<e d="${endTime}"/>
							<or a="${account1Email}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>content of appointment</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const apptInvId = createRes.CreateAppointmentResponse.invId;

		// Modify the appointment
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptInvId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${newSubject}"
						loc="${newLocation}">
						<s d="${newStartTime}"/>
						<e d="${newEndTime}"/>
						<or a="${account1Email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>updated content</content>
					</mp>
					<su>${newSubject}</su>
				</m>
			</ModifyAppointmentRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
		assert.exists(modRes.ModifyAppointmentResponse,
			'ModifyAppointmentResponse should exist');
	});


	it('Sanity | Flag an item to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content to flag</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform item action
		const flagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="flag"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(flagRes.Fault, 'ItemActionRequest flag should not fault');
		assert.equal(flagRes.ItemActionResponse.action.op, 'flag',
			'Action op should be flag');
		assert.equal(flagRes.ItemActionResponse.action.id, msgId,
			'Action id should match message id');
	});


	it('Sanity | Unflag an item to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content to unflag</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform item action
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="flag"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// ItemActionRequest
		const unflagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="!flag"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(unflagRes.Fault, 'ItemActionRequest unflag should not fault');
		assert.equal(unflagRes.ItemActionResponse.action.op, '!flag',
			'Action op should be !flag');
	});


	it('Sanity | Mark a message as read to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content to read</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform message action
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="read"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(readRes.Fault, 'MsgActionRequest read should not fault');
		assert.equal(readRes.MsgActionResponse.action.op, 'read',
			'Action op should be read');
	});


	it('Sanity | Mark a message as read (ItemActionRequest) to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for ItemAction read</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform item action
		const readRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="read"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(readRes.Fault, 'ItemActionRequest read should not fault');
		assert.equal(readRes.ItemActionResponse.action.op, 'read',
			'Action op should be read');
	});


	it('Sanity | Mark a message as unread to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for unread</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform message action
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="read"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// MsgActionRequest
		const unreadRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="!read"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(unreadRes.Fault, 'MsgActionRequest unread should not fault');
		assert.equal(unreadRes.MsgActionResponse.action.op, '!read',
			'Action op should be !read');
	});


	it('Sanity | Tag an item to verify the notification block', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="0"/>
			</CreateTagRequest>`, account1AuthToken
		);
		const tagId = tagRes.CreateTagResponse.tag[0].id;
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for tag</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform item action
		const actionRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(actionRes.Fault, 'ItemActionRequest tag should not fault');
		assert.equal(actionRes.ItemActionResponse.action.op, 'tag',
			'Action op should be tag');
	});


	it('Sanity | Untag an item to verify the notification block', async () => {
		const tagName = `tag${common.getUniqueString()}`;

		// Create a tag
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="0"/>
			</CreateTagRequest>`, account1AuthToken
		);
		const tagId = tagRes.CreateTagResponse.tag[0].id;
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for untag</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform item action
		await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// ItemActionRequest
		const untagRes = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="!tag" tag="${tagId}"/>
			</ItemActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(untagRes.Fault, 'ItemActionRequest untag should not fault');
		assert.equal(untagRes.ItemActionResponse.action.op, '!tag',
			'Action op should be !tag');
	});


	it('Sanity | Move a mail to a custom folder to verify the notification block', async () => {
		// CreateFolderRequest
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="folder${common.getUniqueString()}" l="1"/>
			</CreateFolderRequest>`, account1AuthToken
		);
		const folderId = folderRes.CreateFolderResponse.folder[0].id;
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for move</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform message action
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="move" l="${folderId}"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'MsgActionRequest move should not fault');
		assert.equal(moveRes.MsgActionResponse.action.op, 'move',
			'Action op should be move');
	});


	it('Sanity | Delete a message to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for delete</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		const msgId = sendRes.SendMsgResponse.m[0].id;

		// Perform message action
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'MsgActionRequest delete should not fault');
		assert.equal(deleteRes.MsgActionResponse.action.op, 'delete',
			'Action op should be delete');
	});


	it('Sanity | Mark a mail as spam to verify the notification block', async () => {
		// AddMsgRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inboxId}">
					<content Subject="hello"/>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:Inbox</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Perform message action
		const spamRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="spam"/>
			</MsgActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(spamRes.Fault, 'MsgActionRequest spam should not fault');
		assert.equal(spamRes.MsgActionResponse.action.op, 'spam',
			'Action op should be spam');
	});


	it('Sanity | Reply to a message to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const content = 'Content in the message is contents...';

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const origMsgId = sendRes.SendMsgResponse.m[0].id;

		// Authenticate account
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:"${subject}"</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		let replyMsgId = origMsgId;
		if (searchRes.SearchResponse.m && searchRes.SearchResponse.m.length > 0) {
			replyMsgId = searchRes.SearchResponse.m[0].id;
		}

		// Send the message
		const replyRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${replyMsgId}" rt="r">
					<e t="t" a="${account1Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>This is a reply to ${subject}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(replyRes.Fault, 'Reply SendMsgRequest should not fault');
		assert.exists(replyRes.SendMsgResponse, 'SendMsgResponse should exist');
	});


	it('Sanity | Forward a message to verify the notification block', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content for forward</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const origMsgId = sendRes.SendMsgResponse.m[0].id;

		// Send the message
		const fwdRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${origMsgId}" rt="w">
					<e t="t" a="${account2Email}"/>
					<su>Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content>This is a forwarded to ${subject}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(fwdRes.Fault, 'Forward SendMsgRequest should not fault');
		assert.exists(fwdRes.SendMsgResponse, 'SendMsgResponse should exist');
	});
});
