import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Allitems > Search Allitem', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let account2Email, account2AuthToken;
	let res;

	// Test data variables (from XML properties)
	const searchString = 'Subject of the message is testing';
	const composeContent = 'Content in the message is contents...';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Create account2
		account2Email = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Login as account2 and send messages to account1
		account2AuthToken = await soap.getAccountAuthToken(account2Email);

		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${searchString} </su>
					<mp ct="text/plain">
						<content> ${composeContent} </content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		const msg1Id = sendRes1.SendMsgResponse?.m?.[0].id;

		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msg1Id}" rt="r">
					<e t="t" a="${accountEmail}"/>
					<su> Re: ${searchString} </su>
					<mp ct="text/plain">
						<content> ${composeContent} </content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);

		// Login as account1, create a contact
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${searchString}</a>
					<a n="lastName">${searchString}</a>
					<a n="email">${searchString}@yahoo.com</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
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
	it('Functional | Searching the account with types message,contact,appointment', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"  types="message,contact,appointment,task,document">
				<query>"${searchString}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Searching the account with types conversation,contact,appointment', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"  types="conversation,contact,appointment">
				<query>"${searchString}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});
});
