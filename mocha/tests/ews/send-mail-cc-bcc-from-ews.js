import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Send Mail CC BCC From EWS', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, account4Email, accountPassword;
	const messageSubject = 'Test mail for CC,BCC test';
	const messageContent = 'Message test content';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		account1Email = `ewsccbcc1${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewsccbcc2${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewsccbcc3${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account4Email = `ewsccbcc4${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
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
	it('Sanity | Send an html mail from user1 To user2 with CC user3 and BCC use4 from EWS to ZWC client', async () => {
		const account1Username = account1Email.split('@')[0];
		const account2Username = account2Email.split('@')[0];
		const account3Username = account3Email.split('@')[0];
		const account4Username = account4Email.split('@')[0];
		const mailMime = Buffer.from(
			'User-Agent: Microsoft-MacOutlook/f.1f.0.170216\r\n' +
			'Date: Tue, 8 Aug 2017 04:47:01 -0400 (EDT)\r\n' +
			`Subject: ${messageSubject}\r\n` +
			`Thread-Topic: ${messageSubject}\r\n` +
			'Mime-version: 1.0\r\n' +
			'Content-type: text/plain;\r\n' +
			'\tcharset="UTF-8"\r\n' +
			'Content-transfer-encoding: 7bit\r\n' +
			'\r\n' +
			`${messageContent}`
		).toString('base64');

		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5" />
				</SavedItemFolderId>
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
						<t:CcRecipients>
							<t:Mailbox>
								<t:Name>${account3Username}</t:Name>
								<t:EmailAddress>${account3Email}</t:EmailAddress>
							</t:Mailbox>
						</t:CcRecipients>
						<t:BccRecipients>
							<t:Mailbox>
								<t:Name>${account4Username}</t:Name>
								<t:EmailAddress>${account4Email}</t:EmailAddress>
							</t:Mailbox>
						</t:BccRecipients>
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
			account1Email, accountPassword
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
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		await soap.waitFor(5000);

		// Authenticate account
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		// Search for the item
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const hit2 = Array.isArray(searchRes2.SearchResponse.c)
			? searchRes2.SearchResponse.c[0] : searchRes2.SearchResponse.c;
		assert.equal(hit2.su, messageSubject, 'Subject should match');
		const msgId2 = Array.isArray(hit2.m) ? hit2.m[0].id : hit2.m.id;

		// Get the message
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId2}" />
			</GetMsgRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const msg2 = getMsgRes2.GetMsgResponse.m;
		const msgObj2 = Array.isArray(msg2) ? msg2[0] : msg2;
		const addrs2 = Array.isArray(msgObj2.e) ? msgObj2.e : [msgObj2.e];
		assert.exists(addrs2.find(e => e.t === 'f' && e.a === account1Email),
			'From should be account1');
		assert.exists(addrs2.find(e => e.t === 'c' && e.a === account3Email),
			'Cc should contain account3');
		assert.exists(addrs2.find(e => e.t === 't' && e.a === account2Email),
			'To should contain account2');
		assert.notExists(addrs2.find(e => e.t === 't' && e.a === account4Email),
			'Account4 should not be in To');
		assert.notExists(addrs2.find(e => e.t === 'c' && e.a === account4Email),
			'Account4 should not be in Cc');
		await soap.waitFor(5000);

		// Authenticate account
		const account3AuthToken = await soap.getAccountAuthToken(account3Email, accountPassword);

		// Search for the item
		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');
		const hit3 = Array.isArray(searchRes3.SearchResponse.c)
			? searchRes3.SearchResponse.c[0] : searchRes3.SearchResponse.c;
		assert.equal(hit3.su, messageSubject, 'Subject should match');
		const msgId3 = Array.isArray(hit3.m) ? hit3.m[0].id : hit3.m.id;

		// Get the message
		const getMsgRes3 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId3}" />
			</GetMsgRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(getMsgRes3.Fault, 'Response should not be a Fault');
		const msg3 = getMsgRes3.GetMsgResponse.m;
		const msgObj3 = Array.isArray(msg3) ? msg3[0] : msg3;
		const addrs3 = Array.isArray(msgObj3.e) ? msgObj3.e : [msgObj3.e];
		assert.exists(addrs3.find(e => e.t === 'f' && e.a === account1Email),
			'From should be account1');
		assert.exists(addrs3.find(e => e.t === 'c' && e.a === account3Email),
			'Cc should contain account3');
		assert.exists(addrs3.find(e => e.t === 't' && e.a === account2Email),
			'To should contain account2');
		assert.notExists(addrs3.find(e => e.t === 't' && e.a === account4Email),
			'Account4 should not be in To');
		assert.notExists(addrs3.find(e => e.t === 'c' && e.a === account4Email),
			'Account4 should not be in Cc');

		// Authenticate account
		const account4AuthToken = await soap.getAccountAuthToken(account4Email, accountPassword);

		// Search for the item
		const searchRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account4AuthToken
		);

		// Verify response
		assert.notExists(searchRes4.Fault, 'Response should not be a Fault');
		const hit4 = Array.isArray(searchRes4.SearchResponse.c)
			? searchRes4.SearchResponse.c[0] : searchRes4.SearchResponse.c;
		assert.equal(hit4.su, messageSubject, 'Subject should match');
		const msgId4 = Array.isArray(hit4.m) ? hit4.m[0].id : hit4.m.id;

		// Get the message
		const getMsgRes4 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId4}" />
			</GetMsgRequest>`, account4AuthToken
		);

		// Verify response
		assert.notExists(getMsgRes4.Fault, 'Response should not be a Fault');
		const msg4 = getMsgRes4.GetMsgResponse.m;
		const msgObj4 = Array.isArray(msg4) ? msg4[0] : msg4;
		const addrs4 = Array.isArray(msgObj4.e) ? msgObj4.e : [msgObj4.e];
		assert.exists(addrs4.find(e => e.t === 'f' && e.a === account1Email),
			'From should be account1');
		assert.exists(addrs4.find(e => e.t === 'c' && e.a === account3Email),
			'Cc should contain account3');
		assert.exists(addrs4.find(e => e.t === 't' && e.a === account2Email),
			'To should contain account2');
		assert.notExists(addrs4.find(e => e.t === 't' && e.a === account4Email),
			'Account4 should not be in To');
		assert.notExists(addrs4.find(e => e.t === 'c' && e.a === account4Email),
			'Account4 should not be in Cc');
	});
});
