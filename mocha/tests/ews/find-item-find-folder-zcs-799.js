import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > FindItem FindFolder ZCS-799', function () {
	this.timeout(300 * 1000);
	let account1Email, account1Password, account1AuthToken;
	let folder1Name, folder2Name, folder3Name, folder4Name;
	let folder5Name, folder6Name, folder7Name, folder8Name;
	let folderId1, folderId2, folderId3, folderId4;
	let folderId5, folderId6, folderId7, folderId8;
	let msgSubject, msgSubject1, msgSubject2, msgSubject3, msgSubject4;

	const folderShapeXml = `<FolderShape>
				<t:BaseShape>IdOnly</t:BaseShape>
				<t:AdditionalProperties>
					<t:FieldURI FieldURI="folder:ParentFolderId" />
					<t:FieldURI FieldURI="folder:DisplayName" />
					<t:FieldURI FieldURI="folder:FolderClass" />
					<t:FieldURI FieldURI="folder:ManagedFolderInformation" />
					<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
					<t:FieldURI FieldURI="folder:EffectiveRights" />
				</t:AdditionalProperties>
			</FolderShape>`;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;

		account1Email = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1AuthToken = await soap.getAccountAuthToken(account1Email, account1Password);

		// Create folders under inbox (id=2)
		folder1Name = `folder1.${common.getUniqueString()}`;
		folder2Name = `folder2.${common.getUniqueString()}`;
		folder3Name = `folder3.${common.getUniqueString()}`;
		folder4Name = `folder4.${common.getUniqueString()}`;
		folder5Name = `folder5.${common.getUniqueString()}`;
		folder6Name = `folder6.${common.getUniqueString()}`;
		folder7Name = `folder7.${common.getUniqueString()}`;
		folder8Name = `folder8.${common.getUniqueString()}`;

		// folder1 under inbox
		let res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder1Name}" l="2" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder1 should not be a Fault');
		folderId1 = res.CreateFolderResponse.folder[0].id;

		// folder2 under inbox
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder2Name}" l="2" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder2 should not be a Fault');
		folderId2 = res.CreateFolderResponse.folder[0].id;

		// folder3 under folder2
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder3Name}" l="${folderId2}" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder3 should not be a Fault');
		folderId3 = res.CreateFolderResponse.folder[0].id;

		// folder4 under folder3
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder4Name}" l="${folderId3}" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder4 should not be a Fault');
		folderId4 = res.CreateFolderResponse.folder[0].id;

		// folder5 under sent (id=5)
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder5Name}" l="5" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder5 should not be a Fault');
		folderId5 = res.CreateFolderResponse.folder[0].id;

		// folder6 under folder5
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder6Name}" l="${folderId5}" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder6 should not be a Fault');
		folderId6 = res.CreateFolderResponse.folder[0].id;

		// folder7 under calendar (id=10)
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder7Name}" l="10" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder7 should not be a Fault');
		folderId7 = res.CreateFolderResponse.folder[0].id;

		// folder8 under folder7
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folder8Name}" l="${folderId7}" />
			</CreateFolderRequest>`, account1AuthToken
		);
		assert.notExists(res.Fault, 'CreateFolder8 should not be a Fault');
		folderId8 = res.CreateFolderResponse.folder[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | FindFolder request for Deep traversal', async () => {
		const findFolderRes = await ews.makeEWSRequest(
			`<FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Deep">
				${folderShapeXml}
				<IndexedPageFolderView Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
				</ParentFolderIds>
			</FindFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findFolderRes);
		assert.exists(body.FindFolderResponse, 'FindFolderResponse should exist');
		const msg = body.FindFolderResponse.ResponseMessages.FindFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;
		const folders = folderMsg.RootFolder.Folders.Folder;
		const folderList = Array.isArray(folders) ? folders : [folders];

		// Verify folder1
		assert.equal(folderList[0].FolderId.$.Id, folderId1, 'Folder 1 Id should match');
		assert.equal(folderList[0].ParentFolderId.$.Id, '2', 'Folder 1 parent should be inbox');
		assert.equal(folderList[0].DisplayName, folder1Name, 'Folder 1 name should match');

		// Verify folder2
		assert.equal(folderList[1].FolderId.$.Id, folderId2, 'Folder 2 Id should match');
		assert.equal(folderList[1].ParentFolderId.$.Id, '2', 'Folder 2 parent should be inbox');
		assert.equal(folderList[1].DisplayName, folder2Name, 'Folder 2 name should match');

		// Verify folder3 (child of folder2) — deep traversal should include it
		assert.equal(folderList[2].FolderId.$.Id, folderId3, 'Folder 3 Id should match');
		assert.equal(folderList[2].ParentFolderId.$.Id, folderId2, 'Folder 3 parent should be folder2');
		assert.equal(folderList[2].DisplayName, folder3Name, 'Folder 3 name should match');
	});


	it('Sanity | FindFolder request for Shallow traversal', async () => {
		const findFolderRes = await ews.makeEWSRequest(
			`<FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				${folderShapeXml}
				<IndexedPageFolderView Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
				</ParentFolderIds>
			</FindFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findFolderRes);
		const msg = body.FindFolderResponse.ResponseMessages.FindFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;
		const folders = folderMsg.RootFolder.Folders.Folder;
		const folderList = Array.isArray(folders) ? folders : [folders];

		// Verify folder1
		assert.equal(folderList[0].FolderId.$.Id, folderId1, 'Folder 1 Id should match');
		assert.equal(folderList[0].ParentFolderId.$.Id, '2', 'Folder 1 parent should be inbox');
		assert.equal(folderList[0].DisplayName, folder1Name, 'Folder 1 name should match');

		// Verify folder2
		assert.equal(folderList[1].FolderId.$.Id, folderId2, 'Folder 2 Id should match');
		assert.equal(folderList[1].ParentFolderId.$.Id, '2', 'Folder 2 parent should be inbox');
		assert.equal(folderList[1].DisplayName, folder2Name, 'Folder 2 name should match');

		// Shallow traversal should NOT include folder3 (child of folder2)
		const hasFolder3 = folderList.some(f => f.FolderId.$.Id === folderId3);
		assert.isFalse(hasFolder3, 'Folder 3 should not be in shallow results');
		const hasFolder4 = folderList.some(f => f.FolderId.$.Id === folderId4);
		assert.isFalse(hasFolder4, 'Folder 4 should not be in shallow results');
	});


	it('Sanity | FindFolder request for Deep traversal with Distinguished ID 1', async () => {
		const findFolderRes = await ews.makeEWSRequest(
			`<FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Deep">
				${folderShapeXml}
				<IndexedPageFolderView Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:DistinguishedFolderId Id="inbox" />
				</ParentFolderIds>
			</FindFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findFolderRes);
		const msg = body.FindFolderResponse.ResponseMessages.FindFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;
		const folders = folderMsg.RootFolder.Folders.Folder;
		const folderList = Array.isArray(folders) ? folders : [folders];

		// Verify all 4 inbox subfolders are present
		assert.equal(folderList[0].FolderId.$.Id, folderId1, 'Folder 1 Id should match');
		assert.equal(folderList[0].ParentFolderId.$.Id, '2', 'Folder 1 parent should be inbox');
		assert.equal(folderList[0].DisplayName, folder1Name, 'Folder 1 name should match');

		assert.equal(folderList[1].FolderId.$.Id, folderId2, 'Folder 2 Id should match');
		assert.equal(folderList[1].ParentFolderId.$.Id, '2', 'Folder 2 parent should be inbox');
		assert.equal(folderList[1].DisplayName, folder2Name, 'Folder 2 name should match');

		assert.equal(folderList[2].FolderId.$.Id, folderId3, 'Folder 3 Id should match');
		assert.equal(folderList[2].ParentFolderId.$.Id, folderId2, 'Folder 3 parent should be folder2');
		assert.equal(folderList[2].DisplayName, folder3Name, 'Folder 3 name should match');

		assert.equal(folderList[3].FolderId.$.Id, folderId4, 'Folder 4 Id should match');
		assert.equal(folderList[3].ParentFolderId.$.Id, folderId3, 'Folder 4 parent should be folder3');
		assert.equal(folderList[3].DisplayName, folder4Name, 'Folder 4 name should match');
	});


	it('Sanity | FindFolder request for Deep traversal with Distinguished ID 2', async () => {
		const findFolderRes = await ews.makeEWSRequest(
			`<FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Deep">
				${folderShapeXml}
				<IndexedPageFolderView Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
					<t:FolderId Id="5" />
				</ParentFolderIds>
			</FindFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findFolderRes);
		const msgs = body.FindFolderResponse.ResponseMessages.FindFolderResponseMessage;
		const msgArray = Array.isArray(msgs) ? msgs : [msgs];

		// First response (inbox)
		const inboxFolders = msgArray[0].RootFolder.Folders.Folder;
		const inboxList = Array.isArray(inboxFolders) ? inboxFolders : [inboxFolders];

		assert.equal(inboxList[0].FolderId.$.Id, folderId1, 'Inbox folder 1 Id should match');
		assert.equal(inboxList[0].ParentFolderId.$.Id, '2', 'Inbox folder 1 parent should be 2');
		assert.equal(inboxList[0].DisplayName, folder1Name, 'Inbox folder 1 name should match');

		assert.equal(inboxList[1].FolderId.$.Id, folderId2, 'Inbox folder 2 Id should match');
		assert.equal(inboxList[1].ParentFolderId.$.Id, '2', 'Inbox folder 2 parent should be 2');
		assert.equal(inboxList[1].DisplayName, folder2Name, 'Inbox folder 2 name should match');

		assert.equal(inboxList[2].FolderId.$.Id, folderId3, 'Inbox folder 3 Id should match');
		assert.equal(inboxList[2].ParentFolderId.$.Id, folderId2, 'Inbox folder 3 parent should be folder2');
		assert.equal(inboxList[2].DisplayName, folder3Name, 'Inbox folder 3 name should match');

		assert.equal(inboxList[3].FolderId.$.Id, folderId4, 'Inbox folder 4 Id should match');
		assert.equal(inboxList[3].ParentFolderId.$.Id, folderId3, 'Inbox folder 4 parent should be folder3');
		assert.equal(inboxList[3].DisplayName, folder4Name, 'Inbox folder 4 name should match');

		// Second response (sent)
		const sentFolders = msgArray[1].RootFolder.Folders.Folder;
		const sentList = Array.isArray(sentFolders) ? sentFolders : [sentFolders];

		assert.equal(sentList[0].FolderId.$.Id, folderId5, 'Sent folder 1 Id should match');
		assert.equal(sentList[0].ParentFolderId.$.Id, '5', 'Sent folder 1 parent should be 5');
		assert.equal(sentList[0].DisplayName, folder5Name, 'Sent folder 1 name should match');

		assert.equal(sentList[1].FolderId.$.Id, folderId6, 'Sent folder 2 Id should match');
		assert.equal(sentList[1].ParentFolderId.$.Id, folderId5, 'Sent folder 2 parent should be folder5');
		assert.equal(sentList[1].DisplayName, folder6Name, 'Sent folder 2 name should match');
	});


	it('Sanity | FindFolder request for Deep traversal with Distinguished ID for inbox and sent', async () => {
		const findFolderRes = await ews.makeEWSRequest(
			`<FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Deep">
				${folderShapeXml}
				<IndexedPageFolderView Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:DistinguishedFolderId Id="inbox" />
					<t:DistinguishedFolderId Id="sentitems" />
				</ParentFolderIds>
			</FindFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findFolderRes);
		const msgs = body.FindFolderResponse.ResponseMessages.FindFolderResponseMessage;
		const msgArray = Array.isArray(msgs) ? msgs : [msgs];

		// First response (inbox)
		const inboxFolders = msgArray[0].RootFolder.Folders.Folder;
		const inboxList = Array.isArray(inboxFolders) ? inboxFolders : [inboxFolders];

		assert.equal(inboxList[0].FolderId.$.Id, folderId1, 'Inbox folder 1 Id should match');
		assert.equal(inboxList[0].DisplayName, folder1Name, 'Inbox folder 1 name should match');
		assert.equal(inboxList[1].FolderId.$.Id, folderId2, 'Inbox folder 2 Id should match');
		assert.equal(inboxList[1].DisplayName, folder2Name, 'Inbox folder 2 name should match');
		assert.equal(inboxList[2].FolderId.$.Id, folderId3, 'Inbox folder 3 Id should match');
		assert.equal(inboxList[2].DisplayName, folder3Name, 'Inbox folder 3 name should match');
		assert.equal(inboxList[3].FolderId.$.Id, folderId4, 'Inbox folder 4 Id should match');
		assert.equal(inboxList[3].DisplayName, folder4Name, 'Inbox folder 4 name should match');

		// Second response (sent)
		const sentFolders = msgArray[1].RootFolder.Folders.Folder;
		const sentList = Array.isArray(sentFolders) ? sentFolders : [sentFolders];

		assert.equal(sentList[0].FolderId.$.Id, folderId5, 'Sent folder 1 Id should match');
		assert.equal(sentList[0].ParentFolderId.$.Id, '5', 'Sent folder 1 parent should be 5');
		assert.equal(sentList[0].DisplayName, folder5Name, 'Sent folder 1 name should match');
		assert.equal(sentList[1].FolderId.$.Id, folderId6, 'Sent folder 2 Id should match');
		assert.equal(sentList[1].ParentFolderId.$.Id, folderId5, 'Sent folder 2 parent should be folder5');
		assert.equal(sentList[1].DisplayName, folder6Name, 'Sent folder 2 name should match');
	});


	it('Sanity | FindFolder request for Shallow traversal with Folder ID for calendar folder', async () => {
		const findFolderRes = await ews.makeEWSRequest(
			`<FindFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				${folderShapeXml}
				<IndexedPageFolderView Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="10" />
				</ParentFolderIds>
			</FindFolder>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findFolderRes);
		const msg = body.FindFolderResponse.ResponseMessages.FindFolderResponseMessage;
		const folderMsg = Array.isArray(msg) ? msg[0] : msg;
		const folders = folderMsg.RootFolder.Folders.Folder;
		const folderList = Array.isArray(folders) ? folders : [folders];

		// Verify folder7 is present (immediate child of calendar)
		assert.equal(folderList[0].FolderId.$.Id, folderId7, 'Folder 7 Id should match');
		assert.equal(folderList[0].ParentFolderId.$.Id, '10', 'Folder 7 parent should be calendar');
		assert.equal(folderList[0].DisplayName, folder7Name, 'Folder 7 name should match');

		// Shallow traversal should NOT include folder8 (child of folder7)
		const hasFolder8 = folderList.some(f => f.FolderId.$.Id === folderId8);
		assert.isFalse(hasFolder8, 'Folder 8 should not be in shallow results');
	});


	it('Sanity | FindItem request for Shallow traversal with Folder ID for inbox', async () => {
		// Send 4 messages to the account using admin auth
		const adminAuthToken = await soap.getAdminAuthToken();
		msgSubject = `subject${common.getUniqueString()}`;
		msgSubject1 = `subject1${common.getUniqueString()}`;
		msgSubject2 = `subject2${common.getUniqueString()}`;
		msgSubject3 = `subject3${common.getUniqueString()}`;

		for (const [subj, content] of [
			[msgSubject, 'Message test content'],
			[msgSubject1, 'Message 1 test content'],
			[msgSubject2, 'Message 2 test content'],
			[msgSubject3, 'Message 3 test content'],
		]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${account1Email}" />
						<su>${subj}</su>
						<mp ct="text/plain">
							<content>${content}</content>
						</mp>
					</m>
				</SendMsgRequest>`, adminAuthToken
			);
		}

		await soap.waitFor(30000);

		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:EffectiveRights" />
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<IndexedPageItemView MaxEntriesReturned="5"
					Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findItemRes);
		assert.exists(body.FindItemResponse, 'FindItemResponse should exist');
		const msg = body.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(msg) ? msg[0] : msg;
		const items = itemMsg.RootFolder.Items.Message;
		const itemList = Array.isArray(items) ? items : [items];
		const subjects = itemList.map(i => i.Subject);

		assert.include(subjects, msgSubject, 'Should contain msgSubject');
		assert.include(subjects, msgSubject1, 'Should contain msgSubject1');
		assert.include(subjects, msgSubject2, 'Should contain msgSubject2');
		assert.include(subjects, msgSubject3, 'Should contain msgSubject3');
		assert.equal(
			itemMsg.RootFolder.$.TotalItemsInView, '4',
			'TotalItemsInView should be 4'
		);
	});


	it('Sanity | FindItem request for Shallow traversal with Folder ID for inbox without Additional Properties and max returned 1', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<IndexedPageItemView MaxEntriesReturned="2"
					Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findItemRes);
		const msg = body.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(msg) ? msg[0] : msg;
		const items = itemMsg.RootFolder.Items.Message;
		const itemList = Array.isArray(items) ? items : [items];

		assert.equal(itemList[0].ItemClass, 'IPM.Note', 'First item class should be IPM.Note');
		assert.equal(itemList[1].ItemClass, 'IPM.Note', 'Second item class should be IPM.Note');
		assert.equal(
			itemMsg.RootFolder.$.TotalItemsInView, '4',
			'TotalItemsInView should be 4'
		);
	});


	it('Sanity | FindItem request for Shallow traversal with Folder ID for inbox without Additional Properties and max returned and offset 1', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<IndexedPageItemView MaxEntriesReturned="2"
					Offset="2" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findItemRes);
		const msg = body.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(msg) ? msg[0] : msg;
		const items = itemMsg.RootFolder.Items.Message;
		const itemList = Array.isArray(items) ? items : [items];

		const validSubjects = [msgSubject, msgSubject1, msgSubject2, msgSubject3];
		assert.include(validSubjects, itemList[0].Subject, 'First item subject should exist');
		assert.include(validSubjects, itemList[1].Subject, 'Second item subject should exist');
		assert.equal(
			itemMsg.RootFolder.$.TotalItemsInView, '4',
			'TotalItemsInView should be 4'
		);
	});


	it('Sanity | FindItem request for Shallow traversal with DistinguishedFolder ID for inbox with Additional Properties and max returned 2', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<IndexedPageItemView MaxEntriesReturned="2"
					Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:DistinguishedFolderId Id="inbox" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findItemRes);
		const msg = body.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(msg) ? msg[0] : msg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'FindItem should succeed');
		const items = itemMsg.RootFolder.Items.Message;
		const itemList = Array.isArray(items) ? items : [items];
		assert.equal(itemList.length, 2, 'Should return 2 items');
		assert.exists(itemList[0].Subject, 'First item should have Subject');
	});


	it('Sanity | FindItem request for Shallow traversal with DistinguishedFolder ID for inbox and sent folder with Additional Properties and max returned 2', async () => {
		// Send a message to admin to populate sent folder
		msgSubject4 = `subject4${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="admin@${config.testDomain}" />
					<su>${msgSubject4}</su>
					<mp ct="text/plain">
						<content>Message 4 test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		await soap.waitFor(30000);

		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<IndexedPageItemView MaxEntriesReturned="10"
					Offset="0" BasePoint="Beginning" />
				<ParentFolderIds>
					<t:DistinguishedFolderId Id="inbox" />
					<t:DistinguishedFolderId Id="sentitems" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findItemRes);
		assert.exists(body.FindItemResponse, 'FindItemResponse should exist');
		const msgs = body.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const msgArray = Array.isArray(msgs) ? msgs : [msgs];

		// Collect all subjects across all response messages
		const allSubjects = [];
		for (const m of msgArray) {
			if (m.RootFolder?.Items?.Message) {
				const items = m.RootFolder.Items.Message;
				const itemList = Array.isArray(items) ? items : [items];
				for (const item of itemList) {
					if (item.Subject) allSubjects.push(item.Subject);
				}
			}
		}

		assert.include(allSubjects, msgSubject, 'Should contain msgSubject');
		assert.include(allSubjects, msgSubject1, 'Should contain msgSubject1');
		assert.include(allSubjects, msgSubject2, 'Should contain msgSubject2');
		assert.include(allSubjects, msgSubject3, 'Should contain msgSubject3');
		assert.include(allSubjects, msgSubject4, 'Should contain msgSubject4 in sent');
	});


	it('Sanity | FindItem request for Shallow traversal with Folder ID for inbox without Additional Properties and max returned and offset 2', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<IndexedPageItemView MaxEntriesReturned="4"
					Offset="2" BasePoint="End" />
				<ParentFolderIds>
					<t:FolderId Id="2" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const body = ews.getBody(findItemRes);
		const msg = body.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(msg) ? msg[0] : msg;
		const items = itemMsg.RootFolder.Items.Message;
		const itemList = Array.isArray(items) ? items : [items];

		const validSubjects = [msgSubject, msgSubject1, msgSubject2, msgSubject3];
		assert.include(validSubjects, itemList[1].Subject, 'Second item subject should exist');
		assert.include(validSubjects, itemList[0].Subject, 'First item subject should exist');
		assert.equal(
			itemMsg.RootFolder.$.TotalItemsInView, '4',
			'TotalItemsInView should be 4'
		);
	});
});
