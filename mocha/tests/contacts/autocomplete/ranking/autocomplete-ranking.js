import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Contacts > Autocomplete > Ranking > Autocomplete Ranking', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let contact1Email, contact2Email;
	let account1Token, account2Token;
	let firstname, lastname;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		firstname = `first${common.getUniqueString()}`;
		lastname = `last${common.getUniqueString()}`;

		// Create contact1 account
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

		// Create contact2 account
		contact2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const c2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${contact2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${firstname} ${lastname}</a>
				<a n="givenName">${firstname}</a>
				<a n="sn">${lastname}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(c2.Fault, 'Create contact2 should not fault');

		// Create account1
		const account1Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a1.Fault, 'Create account1 should not fault');
		account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2 with zimbraContactAutoCompleteMaxResults=5
		const account2Email = `account${common.getUniqueString()}@${config.testDomain}`;
		const a2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraContactAutoCompleteMaxResults">5</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(a2.Fault, 'Create account2 should not fault');
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Smoke | Verify ranking in AutoCompleteResponse based on email frequency', async () => {
		// Create local contacts for contact1 and contact2
		const cc1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact1Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(cc1.Fault, 'CreateContact1 should not fault');

		const cc2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">${firstname}</a>
					<a n="lastName">${lastname}</a>
					<a n="email">${contact2Email}</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(cc2.Fault, 'CreateContact2 should not fault');

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
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(s1.Fault, 'SendMsg to contact1 should not fault');

		// Send 2 mails to contact2
		for (let i = 0; i < 2; i++) {
			const s = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${contact2Email}"/>
						<su>subject${common.getUniqueString()}</su>
						<mp ct="text/plain">
							<content>content${common.getUniqueString()}</content>
						</mp>
					</m>
				</SendMsgRequest>`, account1Token
			);
			assert.notExists(s.Fault, `SendMsg ${i + 1} to contact2 should not fault`);
		}

		// AutoComplete and verify contact2 ranked higher than contact1
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 1, 'Should have at least 2 matches');
		const matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(contact2Email)), 'contact2 should be in results');
		assert.isTrue(matchEmails.some(e => e.includes(contact1Email)), 'contact1 should be in results');
		const c2Idx = matchEmails.findIndex(e => e.includes(contact2Email));
		const c1Idx = matchEmails.findIndex(e => e.includes(contact1Email));
		assert.isBelow(c2Idx, c1Idx, 'contact2 should have higher ranking (appear first) than contact1');
	});


	it('Sanity | Verify ranking in AutoCompleteResponse based on email frequency with zimbraContactAutoCompleteMaxResults', async () => {
		// Create 7 contacts as accounts and local contacts (6 in loop + 1 extra)
		const contactEmails = [];
		for (let i = 0; i < 7; i++) {
			const cEmail = `contact${common.getUniqueString()}@${config.testDomain}`;
			const ca = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${cEmail}</name>
					<password>${config.accountPassword}</password>
					<a n="displayName">${firstname} ${lastname}</a>
					<a n="givenName">${firstname}</a>
					<a n="sn">${lastname}</a>
				</CreateAccountRequest>`, adminAuthToken
			);
			assert.notExists(ca.Fault, `Create contact account ${i} should not fault`);

			const cc = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">${firstname}</a>
						<a n="lastName">${lastname}</a>
						<a n="email">${cEmail}</a>
					</cn>
				</CreateContactRequest>`, account2Token
			);
			assert.notExists(cc.Fault, `CreateContact ${i} should not fault`);
			contactEmails.push(cEmail);
		}

		// Send mail to the last contact to boost its ranking
		const lastContact = contactEmails[contactEmails.length - 1];
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${lastContact}" p="${firstname} ${lastname}"/>
					<e t="f" a="${lastContact}"/>
					<su>subject${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2Token
		);
		assert.notExists(sendRes.Fault, 'SendMsg to last contact should not fault');

		// AutoComplete and verify the last contact has highest ranking (appears first)
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${firstname}</name>
			</AutoCompleteRequest>`, account2Token
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should have at least 1 match');
		const matchEmails = matches.map(m => m.email);
		assert.isTrue(matchEmails.some(e => e.includes(lastContact)), 'Last contact should be in results');
		// The last contact should appear first (highest ranking)
		assert.isTrue(matchEmails[0].includes(lastContact), 'Last contact should have the highest ranking (appear first)');
	});
});
