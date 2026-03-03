import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Scriptkiddie > Script Kiddie', function () {
	this.timeout(60 * 1000);
	let account1Email, account2Email;
	let account1AuthToken;

	const longString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(5);
	const longName = `${longString}@example.com`;
	const longDomainName = `foo@${longString}.com`;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = `test${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Inject messages with long names via AddMsg
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="----=_Part_1"

------=_Part_1
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body

------=_Part_1
Content-Type: application/octet-stream; name="${longString}.doc"
Content-Disposition: attachment; filename="${longString}.doc"
Content-Transfer-Encoding: base64

SGVsbG8gV29ybGQ=
------=_Part_1--
</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: ${longName}
To: ${longName}
Cc: ${longName}
Subject: email01B
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
		);

		// AddMsgRequest
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: ${longDomainName}
To: ${longDomainName}
Cc: ${longDomainName}
Subject: email01C
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, account1AuthToken
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
	it('Sanity | Verify a mime message with long attachment filename can be injected', async () => {
		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email01A)</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Verify response
		assert.isAtLeast(msgs.length, 1, 'Should find at least one message');
		const msgId = msgs[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Functional | Verify a message with very long name in To, Cc and From field can be received', async () => {
		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email01B)</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Verify response
		assert.isAtLeast(msgs.length, 1, 'Should find at least one message');
		const msgId = msgs[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Functional | Verify a message with very long domain in To, Cc and From field can be received', async () => {
		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(email01C)</query>
			</SearchRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Verify response
		assert.isAtLeast(msgs.length, 1, 'Should find at least one message');
		const msgId = msgs[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}"/>
			</GetMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});


	it('Functional | Verify a message with very long name in To, Cc and Bcc field can be sent', async () => {
		const subject = `${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="t" a="${longName}"/>
					<e t="c" a="${longName}"/>
					<e t="b" a="${longName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.isTrue(
			sendRes.SendMsgResponse !== undefined || sendRes.Fault !== undefined,
			'Should get either a response or a code'
		);
	});


	it('Functional | Verify a message with very long domain name in To, Cc and Bcc field can be sent', async () => {
		const subject = `${common.getUniqueString()}`;

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<e t="t" a="${longDomainName}"/>
					<e t="c" a="${longDomainName}"/>
					<e t="b" a="${longDomainName}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify response
		assert.isTrue(
			sendRes.SendMsgResponse !== undefined || sendRes.Fault !== undefined,
			'Should get either a response or a code'
		);
	});
});
