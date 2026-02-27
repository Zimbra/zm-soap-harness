import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Auth > Cookie Fmt XML', function () {
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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify 403 return code when using fmt xml and query query without auth cookie (without user part)', async () => {
		// Add a message
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const folder = folderRes.GetFolderResponse.folder;
		const folderObj = Array.isArray(folder) ? folder[0] : folder;
		const folders = Array.isArray(folderObj.folder) ? folderObj.folder : [folderObj.folder];
		const inbox = folders.find(f => f.name === 'Inbox');

		const msgContent = 'content' + common.getUniqueString();
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
${msgContent}
</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');

		// REST with auth token (should succeed)
		const restRes1 = await soap.makeRestRequest(account1Token, {
			auth: 'co',
			fmt: 'xml',
			query: msgContent
		});
		assert.equal(restRes1.status, 200, 'REST with cookie auth should return 200');

		// REST without auth token (no user part → 404)
		const restRes2 = await soap.makeRestRequest(null, {
			auth: 'co',
			fmt: 'xml',
			query: msgContent
		});
		assert.equal(restRes2.status, 404,
			'REST without auth token and without user part should return 404');
	});


	it('Functional | Verify 200 return code when using fmt xml and query query without auth cookie (with user part)', async () => {
		// Add a message
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const folder = folderRes.GetFolderResponse.folder;
		const folderObj = Array.isArray(folder) ? folder[0] : folder;
		const folders = Array.isArray(folderObj.folder) ? folderObj.folder : [folderObj.folder];
		const inbox = folders.find(f => f.name === 'Inbox');

		const msgContent = 'content' + common.getUniqueString();
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
${msgContent}
</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');

		// REST with auth token and user part (should succeed)
		const restRes1 = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			auth: 'co',
			fmt: 'xml',
			query: msgContent
		});
		assert.equal(restRes1.status, 200, 'REST with cookie and user should return 200');

		// REST without auth token but with user part (should return 500)
		const restRes2 = await soap.makeRestRequest(null, {
			user: account1Email,
			auth: 'co',
			fmt: 'xml',
			query: msgContent
		});
		assert.notEqual(restRes2.status, 200,
			'REST without cookie but with user part should not return 200');
	});


	it('Functional | Verify 403 return code when using fmt xml and query query (with user part and invalid auth token)', async () => {
		// Add a message
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
		);
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');
		const folder = folderRes.GetFolderResponse.folder;
		const folderObj = Array.isArray(folder) ? folder[0] : folder;
		const folders = Array.isArray(folderObj.folder) ? folderObj.folder : [folderObj.folder];
		const inbox = folders.find(f => f.name === 'Inbox');

		const msgContent = 'content' + common.getUniqueString();
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="${inbox.id}">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
${msgContent}
</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
		assert.notExists(addRes.Fault, 'Response should not be a Fault');

		// REST with valid auth token (should succeed)
		const restRes1 = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			auth: 'co',
			fmt: 'xml',
			query: msgContent
		});
		assert.equal(restRes1.status, 200, 'REST with valid cookie should return 200');

		// REST with invalid auth token (should return 401)
		const restRes2 = await soap.makeRestRequest('123456780', {
			user: account1Email,
			auth: 'co',
			fmt: 'xml',
			query: msgContent
		});
		assert.equal(restRes2.status, 401,
			'REST with invalid auth token should return 401');
	});
});
