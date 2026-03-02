import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Mail Queue > Mail Queue', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let mtaServer;

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
		const server = Array.isArray(serverRes.GetServerResponse.server)
			? serverRes.GetServerResponse.server[0] : serverRes.GetServerResponse.server;
		const sAttrs = Array.isArray(server.a) ? server.a : [server.a];
		const smtpHost = sAttrs.find(a => a.n === 'zimbraSmtpHostname');
		assert.exists(smtpHost, 'zimbraSmtpHostname should exist');
		mtaServer = smtpHost._content || smtpHost;
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
	it('Functional | Sanity test for GetMailQueueInfoRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailQueueInfoRequest xmlns="urn:zimbraAdmin">
				<server name="${mtaServer}"/>
			</GetMailQueueInfoRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'GetMailQueueInfoRequest should not fault');
		assert.exists(res.GetMailQueueInfoResponse, 'GetMailQueueInfoResponse should exist');
		const server = Array.isArray(res.GetMailQueueInfoResponse.server)
			? res.GetMailQueueInfoResponse.server[0] : res.GetMailQueueInfoResponse.server;
		assert.equal(server.name, mtaServer, 'Server name should match MTA server');
	});


	it('Functional | Sanity test for GetMailQueueRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailQueueRequest xmlns="urn:zimbraAdmin">
				<server name="${mtaServer}">
					<queue name="deferred" scan="1" wait="60">
						<query offset="0" limit="25"/>
					</queue>
				</server>
			</GetMailQueueRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'GetMailQueueRequest should not fault');
		assert.exists(res.GetMailQueueResponse, 'GetMailQueueResponse should exist');
		const server = Array.isArray(res.GetMailQueueResponse.server)
			? res.GetMailQueueResponse.server[0] : res.GetMailQueueResponse.server;
		assert.equal(server.name, mtaServer, 'Server name should match MTA server');
	});


	it('Functional | Sanity test for MailQueueActionRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<MailQueueActionRequest xmlns="urn:zimbraAdmin">
				<server name="${config.zimbraServer || mtaServer}">
					<queue name="deferred">
						<action op="delete" by="id">ALL</action>
					</queue>
				</server>
			</MailQueueActionRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'MailQueueActionRequest should not fault');
		assert.exists(res.MailQueueActionResponse, 'MailQueueActionResponse should exist');
	});


	it('Functional | Sanity test for MailQueueFlushRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<MailQueueFlushRequest xmlns="urn:zimbraAdmin">
				<server name="${mtaServer}"/>
			</MailQueueFlushRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'MailQueueFlushRequest should not fault');
		assert.exists(res.MailQueueFlushResponse, 'MailQueueFlushResponse should exist');
	});
});
