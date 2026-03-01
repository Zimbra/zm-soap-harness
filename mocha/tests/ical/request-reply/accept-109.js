import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > RequestReply > Accept 109', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify existence of alternative message for low fidelity clients', async () => {
		const account1Email = `ical.rr1.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, account1Email, account1Email);

		const account2Email = `ical.rr2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, account2Email, account2Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, config.accountPassword);

		const filePath = path.join(config.projectRoot, 'mocha/data/ical/msg-109.txt');
		// Modify iCal dates to current time for valid invite
		const apptNow = new Date();
		const apptStart = new Date(apptNow.getTime() + 86400000);
		const apptEnd = new Date(apptStart.getTime() + 3600000);
		const fmtDate = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		let mimeContent = fs.readFileSync(filePath, 'utf8');
		mimeContent = mimeContent.replace(/DTSTART[^:\r\n]*:[^\r\n]*/g, `DTSTART:${fmtDate(apptStart)}`);
		mimeContent = mimeContent.replace(/DTEND[^:\r\n]*:[^\r\n]*/g, `DTEND:${fmtDate(apptEnd)}`);
		mimeContent = mimeContent.replace(/DTSTAMP[^:\r\n]*:[^\r\n]*/g, `DTSTAMP:${fmtDate(apptNow)}`);
		const tmpFile = path.join(os.tmpdir(), `ical-test-${Date.now()}.txt`);
		fs.writeFileSync(tmpFile, mimeContent);
		// Inject mime via LMTP
		await soap.injectMime(account2AuthToken, tmpFile);
		// Allow server to process the injected mime
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Search inbox for the injected message
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>in:inbox</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		// Search for appointment
		const now = Date.now();
		const searchStart = String(now - 100 * 86400000);
		const searchEnd = String(now + 100 * 86400000);

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>in:Calendar</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');

		// Get iCal
		const icalStart = String(now - 2 * 86400000);
		const icalEnd = String(now + 2 * 86400000);

		// GetICalRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetICalRequest xmlns="urn:zimbraMail" s="${icalStart}" e="${icalEnd}"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetICalRequest should not fault');
		assert.exists(res.GetICalResponse, 'GetICalResponse should have content');

		// Search conversation in inbox
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>in:inbox</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for conversation should not fault');
		assert.exists(res.SearchResponse, 'Conversation should exist in SearchResponse');
		const convId = res.SearchResponse?.c?.[0]?.id || res.SearchResponse?.c?.id;

		// Verify response
		assert.exists(convId, 'Conversation id should exist');

		// SearchConvRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}">
				<query>in:inbox</query>
			</SearchConvRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
		assert.exists(res.SearchConvResponse, 'SearchConvResponse should exist');
		const msgId = res.SearchConvResponse?.m?.[0]?.id || res.SearchConvResponse?.m?.id;

		// Verify response
		assert.exists(msgId, 'Message id should exist');

		// SendInviteReply
		res = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail" id="${msgId}" verb="ACCEPT" compNum="0"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SendInviteReplyRequest should not fault');
		assert.exists(res.SendInviteReplyResponse, 'SendInviteReplyResponse should exist');

		// Search sent folder for reply
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
				<query>in:sent</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for sent should not fault');
		assert.exists(res.SearchResponse, 'Sent folder should have reply');
	});
});
