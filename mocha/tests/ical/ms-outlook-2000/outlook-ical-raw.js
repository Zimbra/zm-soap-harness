import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('ICAL > Ms Outlook 2000 > Outlook ICAL Raw', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

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
	it('Functional | Verify the basic iCal format when lmtp inject is used to inject the iCal', async () => {
		const accountEmail = `ical.outlook2k.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, accountEmail, accountEmail
		);
		const accountAuthToken = await soap.getAccountAuthToken(
			accountEmail, config.accountPassword
		);

		const mailSubject = 'From outlook';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-raw.txt');
		// Inject mime via LMTP
		await soap.injectMime(accountAuthToken, filePath);

		// Search inbox for the injected message
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>in:inbox</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		const searchResp = res.SearchResponse;

		// Verify response
		assert.exists(searchResp, 'SearchResponse should exist');

		// Verify message details
		const messages = searchResp.m;

		// Verify response
		assert.exists(messages, 'Messages should exist in search response');
		const message = Array.isArray(messages) ? messages[0] : messages;

		// Verify response
		assert.exists(message, 'Message should exist');
		assert.equal(message.su, mailSubject, 'Subject should match');

		// Verify appointment component details
		const comp = message?.inv?.[0]?.comp?.[0] || message?.inv?.comp;
		if (comp) {

			// Verify response
			assert.equal(comp.name, mailSubject, 'Appointment name should match');
			assert.equal(comp.allDay, '1', 'Appointment should be all day');
		}

		// Get message and verify id
		const msgId = message.id;

		// Verify response
		assert.exists(msgId, 'Message id should exist');

		// GetMsgRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(res.GetMsgResponse.m)
			? res.GetMsgResponse.m[0] : res.GetMsgResponse.m;
		assert.exists(getMsg, 'GetMsgResponse should contain m');
	});
});
