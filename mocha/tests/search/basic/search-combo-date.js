import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Basic > Search Combo Date', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Property values from XML source
	const toUser = 'soap03@testsearch.com';
	const originationUser = 'origination_address@origination_domain.com';
	const copyUser = 'copy_address@copy_domain.com';
	const subjectText = 'subject line text';
	const contentText = 'simple text in body';
	const contentAttachText = 'simple text in attachment';
	const timezone = 'America/Los_Angeles';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// email03A: to=soap03@testsearch.com, date=May 1 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1114974000000">
					<content>From: sender@example.com
To: ${toUser}
Subject: email03A
Date: Sun, 01 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03A</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03B: to=soap03@testsearch.com, date=May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: sender@example.com
To: ${toUser}
Subject: email03B
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03B</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03C: to=soap03@testsearch.com, date=May 31 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1117566000000">
					<content>From: sender@example.com
To: ${toUser}
Subject: email03C
Date: Tue, 31 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03C</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03D: from=origination_address, date=May 1 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1114974000000">
					<content>From: ${originationUser}
To: ${accountEmail}
Subject: email03D
Date: Sun, 01 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03D</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03E: from=origination_address, date=May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: ${originationUser}
To: ${accountEmail}
Subject: email03E
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03E</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03F: from=origination_address, date=May 31 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1117566000000">
					<content>From: ${originationUser}
To: ${accountEmail}
Subject: email03F
Date: Tue, 31 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03F</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03G: subject contains "subject line text", date=May 1 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1114974000000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03G ${subjectText}
Date: Sun, 01 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03G</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03H: subject contains "subject line text", date=May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03H ${subjectText}
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03H</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03I: subject contains "subject line text", date=May 31 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1117566000000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03I ${subjectText}
Date: Tue, 31 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content for email03I</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03J: content="simple text in body", date=May 1 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1114974000000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03J
Date: Sun, 01 May 2005 12:00:00 -0700
MIME-Version: 1.0

${contentText}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03K: content="simple text in body", date=May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03K
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0

${contentText}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03L: content="simple text in body", date=May 31 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1117566000000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03L
Date: Tue, 31 May 2005 12:00:00 -0700
MIME-Version: 1.0

${contentText}</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03M: content="simple text in attachment" in attachment, date=May 1 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1114974000000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03M
Date: Sun, 01 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary03m"

--boundary03m
Content-Type: text/plain

Main body
--boundary03m
Content-Type: text/plain; name="attach.txt"
Content-Disposition: attachment; filename="attach.txt"

${contentAttachText}
--boundary03m--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03N: content="simple text in attachment" in attachment, date=May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03N
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary03n"

--boundary03n
Content-Type: text/plain

Main body
--boundary03n
Content-Type: text/plain; name="attach.txt"
Content-Disposition: attachment; filename="attach.txt"

${contentAttachText}
--boundary03n--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03O: content="simple text in attachment" in attachment, date=May 31 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1117566000000">
					<content>From: sender@example.com
To: ${accountEmail}
Subject: email03O
Date: Tue, 31 May 2005 12:00:00 -0700
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary03o"

--boundary03o
Content-Type: text/plain

Main body
--boundary03o
Content-Type: text/plain; name="attach.txt"
Content-Disposition: attachment; filename="attach.txt"

${contentAttachText}
--boundary03o--</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03P: cc=copy_address@copy_domain.com, date=May 1 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1114974000000">
					<content>From: sender@example.com
To: ${accountEmail}
Cc: ${copyUser}
Subject: email03P
Date: Sun, 01 May 2005 12:00:00 -0700
MIME-Version: 1.0

Content for email03P</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03Q: cc=copy_address@copy_domain.com, date=May 15 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1116183600000">
					<content>From: sender@example.com
To: ${accountEmail}
Cc: ${copyUser}
Subject: email03Q
Date: Sun, 15 May 2005 12:00:00 -0700
MIME-Version: 1.0

Content for email03Q</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);

		// email03R: cc=copy_address@copy_domain.com, date=May 31 2005
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2" d="1117566000000">
					<content>From: sender@example.com
To: ${accountEmail}
Cc: ${copyUser}
Subject: email03R
Date: Tue, 31 May 2005 12:00:00 -0700
MIME-Version: 1.0

Content for email03R</content>
					</m>
				</AddMsgRequest>`, accountAuthToken
		);
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
	it('Functional | Login as the appropriate test account', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});


	it('Functional | Verify the results are correct for query using to - and date - , before - , after - (Bug: 2344)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) before:5/5/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) before:5/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) before:4/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) date:5/15/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) date:5/14/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) before:5/16/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) after:5/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) after:5/31/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>to:(${toUser}) after:6/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the results are correct for query using from - and date - , before - , after - 1 (Bug: 2344)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) before:5/5/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) before:5/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) before:4/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) date:5/15/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) date:5/14/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) before:5/16/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) after:5/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) after:5/31/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>from:(${originationUser}) after:6/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the results are correct for query using from - and date - , before - , after - 2 (Bug: 2344)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) before:5/5/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) before:5/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) before:4/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) date:5/15/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) date:5/14/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) before:5/16/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) after:5/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) after:5/31/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>cc:(${copyUser}) after:6/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the results are correct for query using subject - and date - , before - , after - (Bug: 2344)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) before:5/5/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) before:5/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) before:4/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) date:5/15/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) date:5/14/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) before:5/16/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) after:5/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) after:5/31/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>subject:(${subjectText}) after:6/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the results are correct for query using content - and date - , before - , after - (Bug: 2344)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) before:5/5/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) before:5/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) before:4/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) date:5/15/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) date:5/14/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) before:5/16/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) after:5/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) after:5/31/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentText}) after:6/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
	});


	it('Functional | Verify the results are correct for query using content - , in the attachment, and date - , before - , after - (Bug: 2344)', async () => {
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) before:5/5/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.exists(res1.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) before:5/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');

		// Search item
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) before:4/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Search item
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) date:5/15/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) date:5/14/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');

		// Search item
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) before:5/16/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) after:5/30/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		assert.exists(res7.SearchResponse?.m, 'Response element should exist');

		// Search item
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) after:5/31/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');

		// Search item
		const res9 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<tz id="${timezone}"/>
				<query>content:(${contentAttachText}) after:6/1/2005</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res9.Fault, 'Response should not be a Fault');
	});
});
