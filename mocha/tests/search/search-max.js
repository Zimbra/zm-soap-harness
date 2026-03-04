import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Search > Search Max', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const account1 = {};

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Verify SearchRequest with max 10 only returns the first 10 bytes of data (text)', async () => {
		// AddMsgRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: foo@example.com
From:bar@example.com
Subject: testing when you have an invalid skin - another upgrade test
Date: Mon, 22 Oct 2007 16:36:44 -0700 (PDT)
MIME-Version: 1.0
Content-Type: text/plain
The last two weeks have been tough for the No. 18 Cal football team. After sitting at No. 2 for a week, back-to-back losses have caused the Bears to plummet out of the top 10.
Cal will even be an underdog for the first time Saturday when it travels to Sun Devil Stadium to play No. 7 Arizona State at 7 p.m.
But even against the No. 4 team in the BCS, the Bears' goals have not changed one bit.
"Even though you say, all the pressure should be on Arizona State because they're highly ranked and all that kind of stuff, there's still always the expectation to win for us," Cal coach Jeff Tedford said.
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const message1_id = res1.AddMsgResponse.m[0].id;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="1" max="10">
				<query>subject:(invalid skin)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Message should exist');
	});


	it('Sanity | Verify that max will truncate the message body (html)', async () => {
		// AddMsgRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>Date: Fri, 26 Oct 2007 16:19:02 -0700 (PDT)
From: foo@example.com
To: bar@example.com
Subject: the fourth quarter has belonged to anyone but Cal
MIME-Version: 1.0
Content-Type: multipart/alternative;
			boundary="----=_Part_233_76654086.1193440742742"
X-Originating-IP: [10.10.131.107]
------=_Part_233_76654086.1193440742742
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit
As soon as the whistle sounds at the end of the third quarter, Cal fans lift up four fingers and chant "Fourth Quarter's Ours!" And with an offense that scores 35.1 points per game, why shouldn't it be? The Bears have outscored opponents 70-55 in the final stanza this season, including out-scoring No. 5 Oregon 21-7 in Eugene, Ore.
But lately, the fourth quarter has belonged to anyone but Cal. In the Bears' back-to-back losses, they have been outscored down the stretch 21-14. Take away its last win over the Ducks, and Cal has been outscored 31-21 during the fourth quarter in Pac-10 play.
For the third-highest scoring team in the conference, a team with some of the fastest receivers in the nation and a stable full of top-tier running backs, there is no reason that the Bears should be taking their feet off the gas when the points matter most.
------=_Part_233_76654086.1193440742742
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit
&lt;html&gt;&lt;head&gt;&lt;style type='text/css'&gt;body
 { font-family: 'Arial'; font-size: 10pt; color: #000000}&lt;/style&gt;&lt;/head&gt;&lt;body&gt;As soon
 as the whistle sounds at the end of the third quarter, Cal
fans lift up four fingers and chant "Fourth Quarter's Ours!" And with
an offense that scores 35.1 points per game, why shouldn't it be? The
Bears have outscored opponents 70-55 in the final stanza this season,
including out-scoring No. 5 Oregon 21-7 in Eugene, Ore. &lt;p&gt;But lately, the fourth quarter has belonged
 to anyone but Cal.
In the Bears' back-to-back losses, they have been outscored down the
stretch 21-14. Take away its last win over the Ducks, and Cal has been
outscored 31-21 during the fourth quarter in Pac-10 play. &lt;/p&gt;&lt;p&gt;For the third-highest scoring
 team in the conference, a team
with some of the fastest receivers in the nation and a stable full of
top-tier running backs, there is no reason that the Bears should be
taking their feet off the gas when the points matter most. &lt;br&gt;&lt;/p&gt;&lt;p&gt;&lt;br&gt;&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;
------=_Part_233_76654086.1193440742742--
					</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const message1_id = res1.AddMsgResponse.m[0].id;

		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message" fetch="1" html="1" max="10">
				<query>subject:(fourth quarter has belonged)</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse?.m, 'Message should exist');
	});
});
