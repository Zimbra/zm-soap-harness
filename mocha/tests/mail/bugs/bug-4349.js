import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 4349', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Functional | Verify bug 4349', async () => {
		// Create a new domain
		const domainName = `domain${common.getUniqueString()}.com`;
		const createDomainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(createDomainRes.Fault, 'CreateDomainRequest should not fault');

		// Create two accounts on the new domain
		const account1Email = `acct1${common.getUniqueString()}@${domainName}`;
		const account2Email = `acct2${common.getUniqueString()}@${domainName}`;

		const createAcct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct1Res.Fault, 'CreateAccountRequest for account1 should not fault');
		const account1Id = (Array.isArray(createAcct1Res.CreateAccountResponse.account) ? createAcct1Res.CreateAccountResponse.account[0] : createAcct1Res.CreateAccountResponse.account).id;

		const createAcct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcct2Res.Fault, 'CreateAccountRequest for account2 should not fault');
		const account2Id = (Array.isArray(createAcct2Res.CreateAccountResponse.account) ? createAcct2Res.CreateAccountResponse.account[0] : createAcct2Res.CreateAccountResponse.account).id;

		// Login to account1 and send mail to account2
		const authToken1 = await soap.getAccountAuthToken(account1Email);
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;

		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken1
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Login to account2 and verify mail received
		const authToken2 = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${subject}</query>
			</SearchRequest>`, authToken2
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Should find the message');

		// Delete both accounts
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Recreate both accounts
		const recreateAcct1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(recreateAcct1Res.Fault, 'Recreate account1 should not fault');

		const recreateAcct2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(recreateAcct2Res.Fault, 'Recreate account2 should not fault');

		// Login to recreated account1 and send mail again
		const newAuthToken1 = await soap.getAccountAuthToken(account1Email);
		const subject2 = `subject${common.getUniqueString()}`;

		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, newAuthToken1
		);
		assert.notExists(sendRes2.Fault, 'SendMsgRequest after recreate should not fault');

		// Login to recreated account2 and verify mail received
		const newAuthToken2 = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>${subject2}</query>
			</SearchRequest>`, newAuthToken2
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes2.SearchResponse.m, 'Should find the message after recreate');
	});
});
