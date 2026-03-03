import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';
import { server } from '../../../framework/backend/index.js';

describe('Admin > Mail Queue > Mail Queue Action Request', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let mtaServer;
	let accountEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Determine MTA server
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="name">${config.adminEmailAddress}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctRes.Fault, 'GetAccountRequest should not fault');
		const acct = Array.isArray(acctRes.GetAccountResponse.account)
			? acctRes.GetAccountResponse.account[0] : acctRes.GetAccountResponse.account;
		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		assert.exists(mailHost, 'zimbraMailHost should exist');
		const adminServer = mailHost._content || mailHost;

		const serverRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${adminServer}</server>
			</GetServerRequest>`, adminAuthToken
		);
		assert.notExists(serverRes.Fault, 'GetServerRequest should not fault');
		const srv = Array.isArray(serverRes.GetServerResponse.server)
			? serverRes.GetServerResponse.server[0] : serverRes.GetServerResponse.server;
		const sAttrs = Array.isArray(srv.a) ? srv.a : [srv.a];
		const smtpHost = sAttrs.find(a => a.n === 'zimbraSmtpHostname');
		assert.exists(smtpHost, 'zimbraSmtpHostname should exist');
		mtaServer = smtpHost._content || smtpHost;

		// Create test account
		accountEmail = `queue${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
	});

	after(async function () {
		// Restart amavis to restore normal mail flow
		try {
			await server.runCommand('sudo su - zimbra -c \'source /opt/zimbra/.bashrc;/opt/zimbra/bin/zmamavisdctl start\'');
		} catch (e) {
			// Ignore errors during cleanup
		}
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Serial tests
	if (config.serial === true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {

		// Tests
		it('Sanity | Sanity check of MailQueueActionRequest — stop amavis, send message, scan queue, and delete', async () => {
			// Step 1: Stop amavis so messages will be queued
			await server.runCommand('sudo su - zimbra -c \'source /opt/zimbra/.bashrc;/opt/zimbra/bin/zmamavisdctl stop\'');

			// Step 2: Login as account1, send a message
			const accountToken = await soap.getAccountAuthToken(accountEmail);
			const msgSubject = `subject${common.getUniqueString()}`;
			const sendRes = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${accountEmail}"/>
						<su>${msgSubject}</su>
						<mp ct="text/plain">
							<content>content${common.getUniqueString()}</content>
						</mp>
					</m>
				</SendMsgRequest>`, accountToken
			);
			assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

			// Step 3: Wait 15 seconds for message to enter queue
			await soap.waitFor(15000);

			// Step 4: Re-auth as admin and scan deferred queue
			adminAuthToken = await soap.getAdminAuthToken();
			const scanRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetMailQueueRequest xmlns="urn:zimbraAdmin">
					<server name="${mtaServer}">
						<queue name="deferred" scan="1">
							<query limit="25" offset="0"/>
						</queue>
					</server>
				</GetMailQueueRequest>`, adminAuthToken
			);
			assert.notExists(scanRes.Fault, 'GetMailQueueRequest (scan) should not fault');

			// Step 5: Poll until scan is complete (scan="0")
			for (let i = 0; i < 5; i++) {
				await soap.waitFor(1000);
				const pollRes = await soap.makeSOAPEnvelopeAdmin(
					`<GetMailQueueRequest xmlns="urn:zimbraAdmin">
						<server name="${mtaServer}">
							<queue name="deferred">
								<query limit="25" offset="0"/>
							</queue>
						</server>
					</GetMailQueueRequest>`, adminAuthToken
				);
				assert.notExists(pollRes.Fault, 'GetMailQueueRequest (poll) should not fault');
				const pollServer = Array.isArray(pollRes.GetMailQueueResponse.server)
					? pollRes.GetMailQueueResponse.server[0] : pollRes.GetMailQueueResponse.server;
				const pollQueue = Array.isArray(pollServer.queue)
					? pollServer.queue[0] : pollServer.queue;
				if (pollQueue && pollQueue.scan === '0') {
					break;
				}
			}

			// Step 6: Get queue items
			const getRes = await soap.makeSOAPEnvelopeAdmin(
				`<GetMailQueueRequest xmlns="urn:zimbraAdmin">
					<server name="${mtaServer}">
						<queue name="deferred">
							<query limit="25" offset="0"/>
						</queue>
					</server>
				</GetMailQueueRequest>`, adminAuthToken
			);
			assert.notExists(getRes.Fault, 'GetMailQueueRequest should not fault');

			// Step 7: Delete all items from deferred queue via MailQueueActionRequest
			const actionRes = await soap.makeSOAPEnvelopeAdmin(
				`<MailQueueActionRequest xmlns="urn:zimbraAdmin">
					<server name="${mtaServer}">
						<queue name="deferred">
							<action op="delete" by="id">ALL</action>
						</queue>
					</server>
				</MailQueueActionRequest>`, adminAuthToken
			);
			assert.notExists(actionRes.Fault, 'MailQueueActionRequest should not fault');

			// Restart amavis
			await server.runCommand('sudo su - zimbra -c \'source /opt/zimbra/.bashrc;/opt/zimbra/bin/zmamavisdctl start\'');
		});
	}
});
