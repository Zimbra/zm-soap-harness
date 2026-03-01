import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > MessageSentToSelf > Message-Sentto-Self-Basic', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Sanity | Verify sending a mail to self when preference is set to receive messages sent to self as normal', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for receiving messages sent to self as normal
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeNone</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in To field
		const subject1 = `Subject${common.getUniqueString()}`;
		const content1 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Name}"/>
					<su>${subject1}</su>
					<mp ct="text/plain">
						<content>${content1}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is received normally
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject1}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isTrue(inInbox, 'Message should be in the inbox folder');
		} else {
			assert.fail('SearchResponse should contain m');
		}
	});


	it('Functional | Own address in CC field with preference set to receive messages sent to self as normal', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for receiving messages sent to self as normal
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeNone</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in CC field
		const subject2 = `Subject${common.getUniqueString()}`;
		const content2 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="c" a="${account1Name}"/>
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>${content2}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is received normally
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject2}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isTrue(inInbox, 'Message should be in the inbox folder');
		} else {
			assert.fail('SearchResponse should contain m');
		}
	});


	it('Functional | Own address in BCC field with preference set to receive messages sent to self as normal', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for receiving messages sent to self as normal
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeNone</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in BCC field
		const subject3 = `Subject${common.getUniqueString()}`;
		const content3 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="b" a="${account1Name}"/>
					<su>${subject3}</su>
					<mp ct="text/plain">
						<content>${content3}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is received normally
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject3}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isTrue(inInbox, 'Message should be in the inbox folder');
		} else {
			assert.fail('SearchResponse should contain m');
		}
	});


	it('Sanity | Own address in To field with preference set to receive messages sent to self only when address is in To, CC field', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for receiving messages sent to self only when address is in To/CC field
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">secondCopyifOnToOrCC</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in To field
		const subject4 = `Subject${common.getUniqueString()}`;
		const content4 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Name}"/>
					<su>${subject4}</su>
					<mp ct="text/plain">
						<content>${content4}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is received normally
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject4}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isTrue(inInbox, 'Message should be in the inbox folder');
		} else {
			assert.fail('SearchResponse should contain m');
		}
	});


	it('Functional | Own address in CC field with preference set to receive messages sent to self only when address is in To, CC field', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for receiving messages sent to self only when address is in To/CC field
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">secondCopyifOnToOrCC</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in CC field
		const subject5 = `Subject${common.getUniqueString()}`;
		const content5 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="c" a="${account1Name}"/>
					<su>${subject5}</su>
					<mp ct="text/plain">
						<content>${content5}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is received normally
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject5}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isTrue(inInbox, 'Message should be in the inbox folder');
		} else {
			assert.fail('SearchResponse should contain m');
		}
	});


	it('Functional | Own address in BCC field with preference set to receive messages sent to self only when address is in To, CC field', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for receiving messages sent to self only when address is in To/CC field
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">secondCopyifOnToOrCC</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in BCC field
		const subject6 = `Subject${common.getUniqueString()}`;
		const content6 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="b" a="${account1Name}"/>
					<su>${subject6}</su>
					<mp ct="text/plain">
						<content>${content6}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is not received
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject6}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isFalse(inInbox, 'Message should not be in the inbox folder');
		}
	});


	it('Sanity | Own address in To field with preference set to not receive messages sent to self', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for not receiving messages sent to self
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeAll</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in To field
		const subject7 = `Subject${common.getUniqueString()}`;
		const content7 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Name}"/>
					<su>${subject7}</su>
					<mp ct="text/plain">
						<content>${content7}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is not received
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject7}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isFalse(inInbox, 'Message should not be in the inbox folder');
		}
	});


	it('Functional | Own address in CC field with preference set to not receive messages sent to self', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for not receiving messages sent to self
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeAll</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in CC field
		const subject8 = `Subject${common.getUniqueString()}`;
		const content8 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="c" a="${account1Name}"/>
					<su>${subject8}</su>
					<mp ct="text/plain">
						<content>${content8}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is not received
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject8}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isFalse(inInbox, 'Message should not be in the inbox folder');
		}
	});


	it('Functional | Own address in BCC field with preference set to not receive messages sent to self', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Get id of inbox folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const inboxFolderId = getFolderRes.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		// Set preference for not receiving messages sent to self
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">dedupeAll</pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send a message with own address in BCC field
		const subject9 = `Subject${common.getUniqueString()}`;
		const content9 = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="b" a="${account1Name}"/>
					<su>${subject9}</su>
					<mp ct="text/plain">
						<content>${content9}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Verify that the message is not received
		await common.delay(3000);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" sortBy="dateDesc">
				<query>subject:${subject9}</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		if (searchRes.SearchResponse.m) {
			const msgs = Array.isArray(searchRes.SearchResponse.m)
				? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
			const inInbox = msgs.some(m => m.l === inboxFolderId);
			assert.isFalse(inInbox, 'Message should not be in the inbox folder');
		}
	});


	it('Regression | Verify that when preference is set to blank, it attains its default value of receiving messages normally', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Set preference messages sent to self to blank
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf"></pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Verify that preference is set to receive messages normally
		const getPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount"/>`, authToken
		);
		assert.notExists(getPrefsRes.Fault, 'GetPrefsRequest should not fault');

		const prefVal = getPrefsRes.GetPrefsResponse.zimbraPrefDedupeMessagesSentToSelf;
		assert.isTrue(prefVal === undefined || prefVal === 'dedupeNone', 'Preference should be dedupeNone or undefined (default)');
	});


	it('Regression | Verify that when preference is set to spaces, it attains its default value of receiving messages normally', async () => {
		// Create the accounts for testing
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Name);

		// Set preference messages sent to self to space
		const modPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefDedupeMessagesSentToSelf">         </pref>
			</ModifyPrefsRequest>`, authToken
		);
		assert.notExists(modPrefsRes.Fault, 'ModifyPrefsRequest should not fault');

		// Verify that preference is set to receive messages normally
		const getPrefsRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount"/>`, authToken
		);
		assert.notExists(getPrefsRes.Fault, 'GetPrefsRequest should not fault');

		const prefVal = getPrefsRes.GetPrefsResponse.zimbraPrefDedupeMessagesSentToSelf;
		assert.isTrue(prefVal === undefined || prefVal === 'dedupeNone', 'Preference should be dedupeNone or undefined (default)');
	});
});
