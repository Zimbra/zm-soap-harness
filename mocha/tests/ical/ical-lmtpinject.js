import path from 'node:path';
import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('iCal > LMTP Inject', function () {
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
	it('Smoke | Verify the basic iCal format when lmtp inject is used to inject the iCal', async () => {
		const account1Email = `ical.lmtp1.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account1Email, account1Email
		);

		const account2Email = `ical.lmtp2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account2Email, account2Email
		);
		const account2AuthToken = await soap.getAccountAuthToken(
			account2Email, config.accountPassword
		);

		const mailSubject = 'mail1_subject';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/msg01.txt');
		// Inject mime via LMTP
		await soap.injectMime(account2AuthToken, filePath);

		// Search inbox for the injected message
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>in:inbox</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		const searchResp = res.SearchResponse;

		// Verify response
		assert.exists(searchResp, 'SearchResponse should exist');

		// Search for appointment
		const searchStart = '1127586600000';
		const searchEnd = '1131215400000';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});
});
