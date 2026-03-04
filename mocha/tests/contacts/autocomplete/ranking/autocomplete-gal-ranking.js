import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > Autocomplete > Ranking > Autocomplete GAL Ranking', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let gal1Email, gal2Email, contact1Email;
	let account1Token, account2Token, account3Token;
	let firstname, lastname;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		firstname = `first${common.getUniqueString()}`;
		lastname = `last${common.getUniqueString()}`;

		// Create gal1 account with display name
		gal1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const g1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${gal1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstname} ${lastname}</a>
				<a n="givenName">${firstname}</a>
				<a n="sn">${lastname}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(g1.Fault, 'Create gal1 should not fault');
		const g1Info = Array.isArray(g1.CreateAccountResponse.account) ? g1.CreateAccountResponse.account[0] : g1.CreateAccountResponse.account;
		assert.exists(g1Info.id, 'Account ID should exist');
		const g1Host = g1Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(g1Host, 'zimbraMailHost should exist');

		// Create gal2 account with display name
		gal2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const g2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${gal2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstname} ${lastname}</a>
				<a n="givenName">${firstname}</a>
				<a n="sn">${lastname}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(g2.Fault, 'Create gal2 should not fault');
		const g2Info = Array.isArray(g2.CreateAccountResponse.account) ? g2.CreateAccountResponse.account[0] : g2.CreateAccountResponse.account;
		assert.exists(g2Info.id, 'Account ID should exist');
		const g2Host = g2Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(g2Host, 'zimbraMailHost should exist');

		// Create contact1 account with display name
		contact1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${contact1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstname} ${lastname}</a>
				<a n="givenName">${firstname}</a>
				<a n="sn">${lastname}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(c1.Fault, 'Create contact1 should not fault');
		const c1Info = Array.isArray(c1.CreateAccountResponse.account) ? c1.CreateAccountResponse.account[0] : c1.CreateAccountResponse.account;
		assert.exists(c1Info.id, 'Account ID should exist');
		const c1Host = c1Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(c1Host, 'zimbraMailHost should exist');

		// Create account1 with GAL + shared autocomplete enabled
		const account1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a1.Fault, 'Create account1 should not fault');
		const a1Info = Array.isArray(a1.CreateAccountResponse.account) ? a1.CreateAccountResponse.account[0] : a1.CreateAccountResponse.account;
		assert.exists(a1Info.id, 'Account ID should exist');
		const a1Host = a1Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(a1Host, 'zimbraMailHost should exist');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2
		const account2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a2.Fault, 'Create account2 should not fault');
		const a2Info = Array.isArray(a2.CreateAccountResponse.account) ? a2.CreateAccountResponse.account[0] : a2.CreateAccountResponse.account;
		assert.exists(a2Info.id, 'Account ID should exist');
		const a2Host = a2Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(a2Host, 'zimbraMailHost should exist');
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Create account3
		const account3Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraPrefGalAutoCompleteEnabled">TRUE</a>
				<a n="zimbraPrefSharedAddrBookAutoCompleteEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a3.Fault, 'Create account3 should not fault');
		const a3Info = Array.isArray(a3.CreateAccountResponse.account) ? a3.CreateAccountResponse.account[0] : a3.CreateAccountResponse.account;
		assert.exists(a3Info.id, 'Account ID should exist');
		const a3Host = a3Info.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(a3Host, 'zimbraMailHost should exist');
		account3Token = await soap.getAccountAuthToken(account3Email);
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

	// Helper: retry AutoCompleteRequest until expected matches appear (GAL sync may take time)
	async function retryAutoComplete(token, name, minMatches, maxRetries = 5, delayMs = 2000) {
		let matches = [];
		for (let attempt = 0; attempt < maxRetries; attempt++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<AutoCompleteRequest xmlns="urn:zimbraMail">
					<name>${name}</name>
				</AutoCompleteRequest>`, token
			);
			if (res.Fault) break;
			matches = Array.isArray(res.AutoCompleteResponse.match)
				? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
			if (matches.length >= minMatches) return matches;
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
		return matches;
	}

	// Tests
	it('Smoke | Verify ranking in AutoCompleteResponse based on email frequency', async () => {
		// Send 1 mail to gal1
		const s1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${gal1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(s1.Fault, 'SendMsg to gal1 should not fault');

		// Send 2 mails to gal2
		for (let i = 0; i < 2; i++) {
			const s = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${gal2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain">
							<content>content${common.getUniqueString()}</content>
						</mp>
					</m>
				</SendMsgRequest>`, account1Token
			);
			assert.notExists(s.Fault, `SendMsg ${i + 1} to gal2 should not fault`);
		}

		// AutoComplete and verify gal2 ranked higher than gal1 (retry for GAL sync)
		const matches = await retryAutoComplete(account1Token, firstname, 2);
		assert.isAbove(matches.length, 1, 'Should have at least 2 matches');
		const matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(gal2Email)), 'gal2 should be in results');
		assert.isTrue(matchEmails.some(e => e.includes(gal1Email)), 'gal1 should be in results');
		// gal2 should appear before gal1 (higher ranking)
		const gal2Idx = matchEmails.findIndex(e => e.includes(gal2Email));
		const gal1Idx = matchEmails.findIndex(e => e.includes(gal1Email));
		assert.isBelow(gal2Idx, gal1Idx, 'gal2 should have higher ranking (appear first) than gal1');
	});


	it('Sanity | Verify contact appears higher than local contacts if more messages sent to contact', async () => {
		// Create a local contact for contact1
		const cc = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, account2Token
		);
		assert.notExists(cc.Fault, 'CreateContact should not fault');

		// Send 1 mail to gal1
		const s1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${gal1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2Token
		);
		assert.notExists(s1.Fault, 'SendMsg to gal1 should not fault');

		// Send 2 mails to contact1
		for (let i = 0; i < 2; i++) {
			const s = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact1Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain">
							<content>content${common.getUniqueString()}</content>
						</mp>
					</m>
				</SendMsgRequest>`, account2Token
			);
			assert.notExists(s.Fault, `SendMsg ${i + 1} to contact1 should not fault`);
		}

		// AutoComplete and verify contact1 ranked higher than gal1 (retry for GAL sync)
		const matches = await retryAutoComplete(account2Token, firstname, 2);
		assert.isAbove(matches.length, 1, 'Should have at least 2 matches');
		const matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(contact1Email)), 'contact1 should be in results');
		assert.isTrue(matchEmails.some(e => e.includes(gal1Email)), 'gal1 should be in results');
		const c1Idx = matchEmails.findIndex(e => e.includes(contact1Email));
		const g1Idx = matchEmails.findIndex(e => e.includes(gal1Email));
		assert.isBelow(c1Idx, g1Idx, 'contact1 should have higher ranking (appear first) than gal1');
	});


	it('Sanity | Verify GAL appears higher than local contacts if more messages sent to GAL', async () => {
		// Create a local contact for contact1
		const cc = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, account3Token
		);
		assert.notExists(cc.Fault, 'CreateContact should not fault');

		// Send 1 mail to contact1
		const s1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${contact1Email}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3Token
		);
		assert.notExists(s1.Fault, 'SendMsg to contact1 should not fault');

		// Send 2 mails to gal1
		for (let i = 0; i < 2; i++) {
			const s = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${gal1Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain">
							<content>content${common.getUniqueString()}</content>
						</mp>
					</m>
				</SendMsgRequest>`, account3Token
			);
			assert.notExists(s.Fault, `SendMsg ${i + 1} to gal1 should not fault`);
		}

		// AutoComplete and verify gal1 ranked higher than contact1 (retry for GAL sync)
		const matches = await retryAutoComplete(account3Token, firstname, 2);
		assert.isAbove(matches.length, 1, 'Should have at least 2 matches');
		const matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(gal1Email)), 'gal1 should be in results');
		assert.isTrue(matchEmails.some(e => e.includes(contact1Email)), 'contact1 should be in results');
		const g1Idx = matchEmails.findIndex(e => e.includes(gal1Email));
		const c1Idx = matchEmails.findIndex(e => e.includes(contact1Email));
		assert.isBelow(g1Idx, c1Idx, 'gal1 should have higher ranking (appear first) than contact1');
	});
});
