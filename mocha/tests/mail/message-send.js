import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Mail > Message Send', function () {
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
	it('Smoke | Send a mail with valid address in To field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Smoke | Send a mail with valid address in To and Cc field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with To and Cc
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Sanity | Send a mail with valid address in To,Cc and Bcc field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with To, Cc and Bcc
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${account2Email}"/>
					<e t="b" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Functional | Send a mail with a non-existing email Id in To field and existing email id in Cc,Bcc fields', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing To address
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${nonExistingAddr}"/>
					<e t="c" a="${account2Email}"/>
					<e t="b" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with a non-existing email Id in Cc field and existing email id in To,Bcc fields', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing Cc address
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${nonExistingAddr}"/>
					<e t="b" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with non-existing email Id in To,Cc field and an existing email id in Bcc field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account3Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing To and Cc addresses
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${nonExistingAddr}"/>
					<e t="c" a="${nonExistingAddr}"/>
					<e t="b" a="${account3Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with a non-existing email Id in Bcc field and an existing email id in To,Cc field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing Bcc address
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${account2Email}"/>
					<e t="b" a="${nonExistingAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with non-existing email id in To,Bcc fields and an existing email Id in Cc an field.', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing To and Bcc addresses
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${nonExistingAddr}"/>
					<e t="c" a="${account2Email}"/>
					<e t="b" a="${nonExistingAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with non-existing email Id in Cc,Bcc fields and existing email Id in To field.', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing Cc and Bcc addresses
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${nonExistingAddr}"/>
					<e t="b" a="${nonExistingAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with non-existing email Id in To,Cc and Bcc fields', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingAddr = `test112_account112.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with all non-existing addresses
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${nonExistingAddr}"/>
					<e t="c" a="${nonExistingAddr}"/>
					<e t="b" a="${nonExistingAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with spaces in name and valid domain name in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const spaceAddr = ` @${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${spaceAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with spaces in name and valid domain name in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const spaceAddr = ` @${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in Cc name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${spaceAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with spaces in name and valid domain name in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const spaceAddr = ` @${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in Bcc name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${spaceAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with special characters in name and valid domain name in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const specialCharAddr = `a*b/c@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in To name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${specialCharAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with special characters in name and valid domain name in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const specialCharAddr = `a*b/c@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in Cc name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${specialCharAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with special characters in name and valid domain name in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const specialCharAddr = `a*b/c@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in Bcc name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${specialCharAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with digits only in name and valid domain name in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const digitsAddr = `1234@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits only in To name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${digitsAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with digits only in name and valid domain name in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const digitsAddr = `1234@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits only in Cc name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${digitsAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with digits only in name and valid domain name in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const digitsAddr = `1234@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits only in Bcc name
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${digitsAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with alpha numeric characters in name and valid domain name in To field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with alphanumeric To address
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
	});


	it('Regression | Send a mail with alpha numeric characters in name and valid domain name in Cc field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with alphanumeric Cc address
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with alpha numeric characters in name and valid domain name in Bcc field', async () => {
		// Create test accounts
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with alphanumeric Bcc address
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with digits in the starting of name followed by alphabets and valid domain name in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const startDigitAddr = `2test_account.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with start-digit address in To
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${startDigitAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with digits in the starting of name followed by alphabets and valid domain name in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const startDigitAddr = `2test_account.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with start-digit address in Cc
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${startDigitAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with digits in the starting of name followed by alphabets and valid domain name in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const startDigitAddr = `2test_account.name@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with start-digit address in Bcc
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${startDigitAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with same email address in To,Cc,Bcc fields', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with same address in all fields
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<e t="c" a="${account1Email}"/>
					<e t="b" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Regression | Send a mail with valid name in email id but non-existing domain name in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingDomain = 'test_account1.name@zyxwv.aaa';
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing domain in To
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${nonExistingDomain}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with valid name in email id but non-existing domain name in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingDomain = 'test_account1.name@zyxwv.aaa';
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing domain in Cc
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${nonExistingDomain}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with valid name in email id but non-existing domain name in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const nonExistingDomain = 'test_account1.name@zyxwv.aaa';
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with non-existing domain in Bcc
		const subject = `Subject${common.getUniqueString()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${nonExistingDomain}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with spaces in domain name of address in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in domain name
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="test_account1@ "/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with spaces in domain name of address in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in Cc domain name
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="test_account1@ "/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with spaces in domain name of address in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in Bcc domain name
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="test_account1@ "/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with special characters in domain name of address in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in domain
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="test_account1@a*b/c.in"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with special characters in domain name of address in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in Cc domain
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="test_account1@a*b/c.in"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with special characters in domain name of address in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in Bcc domain
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="test_account1@a*b/c.in"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with only digits in domain name of address in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits only in domain
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="test_account1@1234"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with only digits in domain name of address in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits only in Cc domain
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="test_account1@1234"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with only digits in domain name of address in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits only in Bcc domain
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="test_account1@1234"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_ABORTED_ADDRESS_FAILURE',
			'Should be SEND_ABORTED_ADDRESS_FAILURE');
	});


	it('Regression | Send a mail with domain name starting with digits of address in To field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const startDigitDomain = `test_account1@1234example.persistent.co.in`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with domain starting with digits in To
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${startDigitDomain}"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with domain name starting with digits of address in Cc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const startDigitDomain = `test_account1@1234example.persistent.co.in`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with domain starting with digits in Cc
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="c" a="${startDigitDomain}"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with domain name starting with digits of address in Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const startDigitDomain = `test_account1@1234example.persistent.co.in`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with domain starting with digits in Bcc
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="b" a="${startDigitDomain}"/>
					<su>Subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		assert.exists(res.SendMsgResponse.m, 'SendMsgResponse should contain m');
	});


	it('Regression | Send a mail with only spaces in Subject of message', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with spaces in subject
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>   </su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Regression | Send a mail with only special characters in Subject of message', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with special chars in subject
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>!@#</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Regression | Send a mail with only digits in Subject of message', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with digits in subject
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>123456</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Regression | Send a mail with no address in To,Cc,Bcc field', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with no address
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);

		// Verify fault response
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'mail.SEND_FAILURE',
			'Should be SEND_FAILURE');
	});


	it('Regression | SendMsgRequest with origid as invalid (sometext, spchar, number, negative, decimal, blank)', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send with origid as sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="some text">
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should return a Fault for sometext origid');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Send with origid as spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="//\\\\''^%">
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should return a Fault for spchar origid');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Send with origid as number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="123" a="${account1Email}">
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Should return a Fault for number origid');
		assert.include(res3.Fault.Detail.Error.Code, 'mail.SEND_FAILURE');

		// Send with origid as negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="-2" a="${account1Email}">
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Should return a Fault for negative origid');
		assert.include(res4.Fault.Detail.Error.Code, 'mail.SEND_FAILURE');

		// Send with origid as decimal
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="2.09">
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res5.Fault.Detail.Error.Code, 'Should return a Fault for decimal origid');
		assert.include(res5.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Send with origid as blank
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="">
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res6.Fault.Detail.Error.Code, 'Should return a Fault for blank origid');
		assert.include(res6.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | SendMsgRequest with different value of personal name (sometext, spchar, number, negative, decimal, blank)', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send with personal name as sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="some text"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res1.Fault, 'SendMsgRequest should not fault for sometext personal name');
		const sentMsg = Array.isArray(res1.SendMsgResponse.m)
			? res1.SendMsgResponse.m[0] : res1.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Send with personal name as spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="//\\\\''^%"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res2.Fault, 'SendMsgRequest should not fault for spchar personal name');

		// Send with personal name as number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="123"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res3.Fault, 'SendMsgRequest should not fault for number personal name');

		// Send with personal name as negative
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="-2"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res4.Fault, 'SendMsgRequest should not fault for negative personal name');

		// Send with personal name as decimal
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="2.09"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res5.Fault, 'SendMsgRequest should not fault for decimal personal name');

		// Send with personal name as blank
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p=""/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res6.Fault, 'SendMsgRequest should not fault for blank personal name');
	});


	it('Functional | SendMsgRequest with add option as 1', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with add option as 1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="${account1Email}" add="1"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Verify contact was added
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<a n="email"/>
			</GetContactsRequest>`, authToken
		);
		assert.notExists(contactRes.Fault, 'GetContactsRequest should not fault');
		const contactId = contactRes.GetContactsResponse?.cn?.id
			|| (Array.isArray(contactRes.GetContactsResponse?.cn)
				? contactRes.GetContactsResponse.cn[0].id : undefined);
		assert.exists(contactId, 'Contact should have been added');

		// Clean up contact
		await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action id="${contactId}" op="delete"/>
			</ContactActionRequest>`, authToken
		);
	});


	it('Functional | SendMsgRequest with add option as 0', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with add option as 0
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}" p="${account1Email}" add="0"/>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Verify contact was NOT added
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<a n="email"/>
			</GetContactsRequest>`, authToken
		);
		assert.notExists(contactRes.Fault, 'GetContactsRequest should not fault');
	});


	it('Regression | SendMsgRequest with irt attribute as invalid (sometext, spchar, number, negative, decimal, blank)', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send with irt as sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<irt>some text</irt>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res1.Fault, 'SendMsgRequest should not fault for sometext irt');
		const sentMsg = Array.isArray(res1.SendMsgResponse.m)
			? res1.SendMsgResponse.m[0] : res1.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Send with irt as spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<irt>//\\\\''^%</irt>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res2.Fault, 'SendMsgRequest should not fault for spchar irt');

		// Send with irt as number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<irt>123</irt>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res3.Fault, 'SendMsgRequest should not fault for number irt');

		// Send with irt as blank
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<irt></irt>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res4.Fault, 'SendMsgRequest should not fault for blank irt');
	});


	it('Regression | SendMsgRequest with content type as invalid (sometext, spchar, number, negative, decimal, blank)', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send with ct as sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="some text">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res1.Fault, 'SendMsgRequest should not fault for sometext ct');
		const sentMsg = Array.isArray(res1.SendMsgResponse.m)
			? res1.SendMsgResponse.m[0] : res1.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Send with ct as number
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="123">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res2.Fault, 'SendMsgRequest should not fault for number ct');
		const sentMsg21 = Array.isArray(res2.SendMsgResponse.m)
			? res2.SendMsgResponse.m[0] : res2.SendMsgResponse.m;
		assert.exists(sentMsg21.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Send with ct as blank
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res3.Fault, 'SendMsgRequest should not fault for blank ct');
		const sentMsg22 = Array.isArray(res3.SendMsgResponse.m)
			? res3.SendMsgResponse.m[0] : res3.SendMsgResponse.m;
		assert.exists(sentMsg22.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	it('Regression | SendMsgRequest with aid as invalid (sometext, spchar, number, negative, decimal, blank)', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send with aid as sometext
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="some text">
						<content>Content in the message is contents...</content>
					</mp>
					<attach aid="some text"/>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should return a Fault for sometext aid');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Send with aid as spchar
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="some text">
						<content>Content in the message is contents...</content>
					</mp>
					<attach aid="//\\\\''^%"/>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should return a Fault for spchar aid');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Send with aid as number
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="some text">
						<content>Content in the message is contents...</content>
					</mp>
					<attach aid="123"/>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res3.Fault.Detail.Error.Code, 'Should return a Fault for number aid');
		assert.include(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Send with aid as blank
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<mp ct="some text">
						<content>Content in the message is contents...</content>
					</mp>
					<attach aid=""/>
				</m>
			</SendMsgRequest>`, authToken, false
		);
		assert.isString(res4.Fault.Detail.Error.Code, 'Should return a Fault for blank aid');
		assert.include(res4.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Functional | SendMsgRequest with attribute suid', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a message with suid attribute
		const suid = `${Date.now()}`;
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest suid="${suid}" xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>message with suid</su>
					<mp ct="text/plain">
						<content>test message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify the response
		assert.notExists(res.Fault, 'SendMsgRequest should not fault');
		const sentMsg23 = Array.isArray(res.SendMsgResponse.m)
			? res.SendMsgResponse.m[0] : res.SendMsgResponse.m;
		assert.exists(sentMsg23.id, 'sent msg id should exist');
		assert.isString(sentMsg23.id, 'Sent message should have an id');
	});


	it('Functional | Send two SendMsgRequests with the same suid', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send first message with suid
		const suid = `${Date.now()}`;
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest suid="${suid}" xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>message with suid</su>
					<mp ct="text/plain">
						<content>test message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res1.Fault, 'First SendMsgRequest should not fault');

		// Send second message with same suid
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest suid="${suid}" xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>message with suid</su>
					<mp ct="text/plain">
						<content>test message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(res2.Fault, 'Second SendMsgRequest should not fault');
	});


	it('Functional | Send a message with content type with a space in it', async () => {
		// Create test account
		const account1Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const authToken = await soap.getAccountAuthToken(account1Email);

		// Send a multipart message with content type containing space
		const subject = `subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>${content}</content>
						</mp>
						<mp ct="application/Microsoft MapPoint">
							<content>${content}</content>
						</mp>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg24 = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg24.id, 'sent msg id should exist');
		assert.isString(sentMsg24.id, 'Sent message should have an id');
		const messageId = (Array.isArray(sendRes.SendMsgResponse.m) ? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m).id;

		// Get the message to verify
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, authToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const getMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
	});
});
