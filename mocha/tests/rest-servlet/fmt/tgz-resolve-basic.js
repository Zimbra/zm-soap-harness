import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Fmt > TGZ > Resolve Basic', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Add messages
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: resolveTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nresolve test\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Export mailbox as tgz and import to another account with resolve=skip', async () => {
		// Export from account1
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');
		assert.isAbove(exportRes.body.length, 10, 'TGZ should have content');

		// Import to account2 with resolve=skip
		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Inbox',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar',
			extraParams: { resolve: 'skip' }
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});


	it('Sanity | Export and import with resolve=modify', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Inbox',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar',
			extraParams: { resolve: 'modify' }
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});


	it('Sanity | Export and import with resolve=replace', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Inbox',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar',
			extraParams: { resolve: 'replace' }
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});


	it('Sanity | Export and import with resolve=reset', async () => {
		const exportRes = await soap.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'tgz',
			returnBuffer: true
		});
		assert.equal(exportRes.status, 200, 'Export should return 200');

		const importRes = await soap.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Inbox',
			fmt: 'tgz',
			fileBuffer: exportRes.body,
			contentType: 'application/x-tar',
			extraParams: { resolve: 'reset' }
		});
		assert.equal(importRes.status, 200, 'Import should return 200');
	});
});
