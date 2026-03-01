import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Fmt > TGZ', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let messageId;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Add messages to inbox
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: tgzTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\ntgz test content\r\n</content>
				</m>
			</AddMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(addRes.Fault, 'Response should not be a Fault');
		messageId = addRes.AddMsgResponse?.m?.id
			|| (Array.isArray(addRes.AddMsgResponse?.m)
				? addRes.AddMsgResponse.m[0].id : undefined);
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
	it('Sanity | Get a message in tgz format via REST servlet', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: messageId,
			fmt: 'tgz',
			returnBuffer: true
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.isAbove(res.body.length, 10, 'Response should have tgz content');
	});


	it('Sanity | Get a folder in tgz format via REST servlet', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'tgz',
			returnBuffer: true
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.isAbove(res.body.length, 10, 'Response should have tgz content');
	});


	it('Sanity | Get entire mailbox in tgz format via REST servlet', async () => {
		const res = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			fmt: 'tgz',
			returnBuffer: true
		});

		// Verify response
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.isAbove(res.body.length, 10, 'Response should have tgz content');
	});
});
