import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Virus Basic', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Verify that a eicar message is not sent to the mailbox', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Send modify config request
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraAttachmentsScanEnabled">TRUE</a>
				<a n="zimbraVirusWarnRecipient">TRUE</a>
				<a n="zimbraVirusWarnAdmin">TRUE</a>
				<a n="zimbraAttachmentsViewInHtmlOnly">TRUE</a>
				<a n="zimbraAttachmentsBlocked">TRUE</a>
				<a n="zimbraVirusBlockEncryptedArchive">TRUE</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modifyRes.Fault,
			'ModifyConfigRequest should not fault');

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test av
Content-Type: text/plain

X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(modifyRes.ModifyConfigResponse,
			'ModifyConfigResponse should exist');
	});


	it('Functional | Verify that notification is sent to users mailbox', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that notification is sent to admins mailbox', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const adminAcctToken = adminAuthToken;

		// Search item
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:inbox</query>
			</SearchRequest>`, adminAcctToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Verify that attachments are scanned', async () => {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send get all config request
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			'<GetAllConfigRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
		);

		// Verify response
		assert.notExists(configRes.Fault,
			'GetAllConfigRequest should not fault');
		assert.exists(configRes.GetAllConfigResponse,
			'GetAllConfigResponse should exist');
	});
});
