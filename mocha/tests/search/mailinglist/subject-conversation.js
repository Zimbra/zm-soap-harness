import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > MailingList > Subject Conversation', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const mailinglist = { name: `mailinglist_${common.getUniqueString()}`, subject: `mailinglist_${common.getUniqueString()}`, from: accountEmail, content: `mailinglist_${common.getUniqueString()}`, value: `mailinglist_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `mailinglist_id`, toString() { return this.name; } };
	const message1 = { name: `message1_${common.getUniqueString()}`, subject: `message1_${common.getUniqueString()}`, from: accountEmail, content: `message1_${common.getUniqueString()}`, value: `message1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `message1_id`, toString() { return this.name; } };

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify conversations can be searched by subject for text in brackets (Bug: 37010)', async () => {
		// AddMsgRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="2">
                    <content>From: foo@foo.com
To: foo@foo.com
Subject: [${mailinglist.name}] ${message1.subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
simple text string in the body
</content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const message1_id = res1.AddMsgResponse.m[0].id;

		// AddMsgRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="2">
                    <content>From: foo@foo.com
To: foo@foo.com
Subject: RE: [${mailinglist.name}] ${message1.subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
simple text string in the body
</content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const message2_id = res2.AddMsgResponse.m[0].id;

		// AddMsgRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="2">
                    <content>From: foo@foo.com
To: foo@foo.com
Subject: FWD: [${mailinglist.name}] ${message1.subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
simple text string in the body
</content>
                </m>
            </AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const message3_id = res3.AddMsgResponse.m[0].id;
		const conversation1_id = res3.AddMsgResponse.m[0].cid;

		// SearchRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
			<query>subject:(${mailinglist.name})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res4.SearchResponse, 'Response element should exist');
		assert.exists(res4.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="conversation">
			<query>subject:(${message1.subject})</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'Response element should exist');
		assert.exists(res5.SearchResponse, 'Response element should exist');
	});
});
