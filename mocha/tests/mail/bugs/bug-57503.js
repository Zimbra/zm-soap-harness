import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 57503', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Mime parse appointment invitation from iphone block reindexing', async () => {
		// Create the account
		const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = (Array.isArray(createRes.CreateAccountResponse.account) ? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account).id;
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Add an iphone-style invitation message via AddMsgRequest
		const subject = 'SMB GTM Team meeting';
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: foo@foo.com
To: ${accountEmail}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundaryIphone"
--boundaryIphone
Content-Type: text/plain
Team meeting invitation
--boundaryIphone
Content-Type: text/calendar; method=REQUEST; charset="utf-8"
BEGIN:VCALENDAR
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:20110101T100000Z
DTEND:20110101T110000Z
SUMMARY:${subject}
END:VEVENT
END:VCALENDAR
--boundaryIphone--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Trigger reindex via admin
		const reindexRes = await soap.makeSOAPEnvelopeAdmin(
			`<ReIndexRequest xmlns="urn:zimbraAdmin" action="start">
				<mbox id="${accountId}"/>
			</ReIndexRequest>`, adminAuthToken
		);
		assert.notExists(reindexRes.Fault, 'ReIndexRequest should not fault');
		assert.equal(reindexRes.ReIndexResponse.status, 'started', 'ReIndex should have started');

		// Poll for reindex completion
		let reindexComplete = false;
		for (let i = 0; i < 10; i++) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			const statusRes = await soap.makeSOAPEnvelopeAdmin(
				`<ReIndexRequest xmlns="urn:zimbraAdmin" action="status">
					<mbox id="${accountId}"/>
				</ReIndexRequest>`, adminAuthToken
			);
			if (statusRes.ReIndexResponse && statusRes.ReIndexResponse.status === 'idle') {
				reindexComplete = true;
				break;
			}
		}
		assert.isTrue(reindexComplete, 'ReIndex should complete without blocking');

		// Verify search works after reindex
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, authToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message after reindex');

		// Verify mailbox is running
		const serviceRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetServiceStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(serviceRes.Fault, 'GetServiceStatusRequest should not fault');
		assert.exists(serviceRes.GetServiceStatusResponse, 'Service status should be available');
	});
});
