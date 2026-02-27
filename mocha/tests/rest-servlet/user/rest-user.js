import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > User > REST User', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Add a message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: userRestTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nuser rest test content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Access REST servlet with user path and verify inbox', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'rss'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'userRestTest', 'Response should contain message subject');
	});


	it('Sanity | Access REST servlet using user path with calendar folder', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VCALENDAR', 'Response should contain VCALENDAR');
	});


	it('Sanity | Access REST servlet using user path with contacts folder', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Contacts',
			fmt: 'csv'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});


	it('Functional | Access REST servlet user path with message ID', async () => {
		// Search for the message to get its ID
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:userRestTest</query>
            </SearchRequest>`, account1Token
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const msgs = searchRes.SearchResponse?.m;
		const msgArr = Array.isArray(msgs) ? msgs : (msgs ? [msgs] : []);
		assert.isAbove(msgArr.length, 0, 'Should find message');
		const msgId = msgArr[0].id;

		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			id: msgId
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'userRestTest', 'Response should contain subject');
	});


	it('Functional | Access REST servlet with non-existent folder returns error', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'NonExistentFolder' + common.getUniqueString(),
			fmt: 'rss'
		});
		assert.notEqual(res.status, 200, 'Non-existent folder should not return 200');
	});


	it('Functional | Access REST servlet with subfolder path', async () => {
		// Create subfolder under Inbox
		const folderName = 'sub' + common.getUniqueString();
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder name="${folderName}" l="2"/>
            </CreateFolderRequest>`, account1Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');

		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox/' + folderName,
			fmt: 'rss'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});


	it('Functional | Access REST servlet inbox via tilde URL', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'xml'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'userRestTest', 'XML should contain message');
	});


	it('Functional | Access REST servlet with Sent folder', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Sent',
			fmt: 'rss'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});


	it('Functional | Access REST servlet with Drafts folder', async () => {
		const res = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Drafts',
			fmt: 'rss'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});
});
