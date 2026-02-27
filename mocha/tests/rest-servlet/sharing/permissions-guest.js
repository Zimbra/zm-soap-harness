import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > Sharing > Permissions Guest', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Token;
	let account2Email, account2Token;
	let guestEmail;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);
		guestEmail = 'guest' + common.getUniqueString() + '@external.com';

		// Add messages to account1
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com\r\nTo: ${account1Email}\r\nSubject: sharingTest\r\nMIME-Version: 1.0\r\nContent-Type: text/plain\r\n\r\nsharing content\r\n</content>
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
	it('Sanity | Share a folder with guest user and verify access via REST', async () => {
		// Share inbox with guest
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="2">
					<grant gt="guest" inh="1" perm="r" d="${guestEmail}" pw="test123"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');

		// Access shared folder via REST with guest credentials
		const res = await soap.makeRestRequest(null, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'rss',
			auth: 'ba',
			guest: guestEmail,
			password: 'test123'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});


	it('Sanity | Share with guest and verify correct password required', async () => {
		// Access with wrong password should fail
		const res = await soap.makeRestRequest(null, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'rss',
			auth: 'ba',
			guest: guestEmail,
			password: 'wrongpassword'
		});
		assert.notEqual(res.status, 200, 'Wrong password should not return 200');
	});


	it('Sanity | Share a calendar folder with guest and verify access', async () => {
		// Share calendar with guest
		const calGrantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="guest" inh="1" perm="r" d="${guestEmail}" pw="test456"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(calGrantRes.Fault, 'Response should not be a Fault');

		const res = await soap.makeRestRequest(null, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics',
			auth: 'ba',
			guest: guestEmail,
			password: 'test456'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});


	it('Sanity | Verify guest access to contacts folder', async () => {
		// Share contacts with guest
		const contactGrantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="7">
					<grant gt="guest" inh="1" perm="r" d="${guestEmail}" pw="test789"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
		assert.notExists(contactGrantRes.Fault, 'Response should not be a Fault');

		const res = await soap.makeRestRequest(null, {
			user: account1Email,
			folder: 'Contacts',
			fmt: 'csv',
			auth: 'ba',
			guest: guestEmail,
			password: 'test789'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
	});


	it('Sanity | Verify unauthenticated access is denied to private folder', async () => {
		const res = await soap.makeRestRequest(null, {
			user: account1Email,
			folder: 'Inbox',
			fmt: 'rss'
		});
		// Without auth, should get redirected or denied
		assert.notEqual(res.status, 200, 'Unauthenticated access should not return 200');
	});
});
