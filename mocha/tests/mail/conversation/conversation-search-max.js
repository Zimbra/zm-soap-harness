import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Search Max', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let accountEmail, authToken;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create a test account
		accountEmail = `test${common.getUniqueString()}@${testDomain}`;
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
		authToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Verify SearchConvRequest with max 10 only returns the first 10 bytes of data (text)', async () => {
		// Get folder IDs
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, authToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Add a long text message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>To: foo@example.com
From: bar@example.com
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
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		const convId = msg.cid;

		// SearchConvRequest with max=10
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}" fetch="1" max="10">
				<query>subject:(invalid skin)</query>
			</SearchConvRequest>`, authToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
	});


	it('Sanity | Verify that max will truncate the message body (html)', async () => {
		// Add an HTML message
		const addRes = await soap.makeSOAPEnvelopeAccount(
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
As soon as the whistle sounds at the end of the third quarter, Cal fans lift up four fingers and chant "Fourth Quarter's Ours!" And with an offense that scores 35.1 points per game, why shouldn't it be? The Bears have outscored opponents 70-55 in the final stanza this season.
------=_Part_233_76654086.1193440742742
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit
&lt;html&gt;&lt;head&gt;&lt;style type='text/css'&gt;body { font-family: 'Arial'; font-size: 10pt; color: #000000}&lt;/style&gt;&lt;/head&gt;&lt;body&gt;As soon as the whistle sounds at the end of the third quarter, Cal fans lift up four fingers and chant "Fourth Quarter's Ours!" And with an offense that scores 35.1 points per game, why shouldn't it be?&lt;/body&gt;&lt;/html&gt;
------=_Part_233_76654086.1193440742742--
</content>
				</m>
			</AddMsgRequest>`, authToken
		);
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msg = Array.isArray(addRes.AddMsgResponse.m)
			? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
		const convId = msg.cid;

		// SearchConvRequest with max=10 and html=1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}" fetch="1" html="1" max="10">
				<query>subject:(fourth quarter has belonged)</query>
			</SearchConvRequest>`, authToken
		);
		assert.notExists(res.Fault, 'SearchConvRequest should not fault');
	});
});
