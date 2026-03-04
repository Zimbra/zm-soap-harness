import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Autocomplete > Autocomplete Lucene', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountToken;
	const contactIds = {};

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
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
		accountToken = await soap.getAccountAuthToken(accountEmail);

		// Create 14 contacts matching XML properties
		const contacts = [
			{ key: '1', first: 'a', last: 'an', email: 'an@and.com' },
			{ key: '2', first: 'ann', last: 'andy', email: 'test@xyz.com' },
			{ key: '3', first: 'area', last: 'aset', email: 'butt@fort.com' },
			{ key: '4', first: 'asean', last: 'at', email: 'as_at@at.in' },
			{ key: '5', first: 'be', last: 'there', email: 'there_be@was.com' },
			{ key: '6', first: 'bye', last: 'bet', email: 'bye@bit.com' },
			{ key: '7', first: 'withy', last: 'will', email: 'willy_withy@was.com' },
			{ key: '8', first: 'wasen', last: 'tone', email: 'wasen.to@will.li' },
			{ key: '9', first: 'this', last: 'theyn', email: 'theybor@into.in' },
			{ key: '10', first: 'thesen', last: 'theny', email: 'their_of@pony.of' },
			{ key: '11', first: 'thatr', last: 'sucht', email: 'orange@those.for' },
			{ key: '12', first: 'only', last: 'notch', email: 'iten@onf.co' },
			{ key: '13', first: 'forten', last: 'inoova', email: 'offseat@ggoat.com' },
			{ key: '14', first: 'isetent', last: 'ifto', email: 'ifis@isoif.is' }
		];

		for (const c of contacts) {
			const createRes = await soap.makeSOAPEnvelopeAccount(
				`<CreateContactRequest xmlns="urn:zimbraMail">
					<cn>
						<a n="firstName">${c.first}</a>
						<a n="lastName">${c.last}</a>
						<a n="fullName">${c.first} ${c.last}</a>
						<a n="email">${c.email}</a>
					</cn>
				</CreateContactRequest>`, accountToken
			);
			assert.notExists(createRes.Fault, 'CreateContact should not fault');
			const cn = Array.isArray(createRes.CreateContactResponse.cn)
				? createRes.CreateContactResponse.cn[0] : createRes.CreateContactResponse.cn;
			assert.exists(cn.id, 'Contact id should exist');
			contactIds[c.key] = cn.id;
		}
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
	it('Smoke | Lucene AutoComplete test for a', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>a</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['1'], 'Contact 1 should be in results');
		assert.include(matchIds, contactIds['2'], 'Contact 2 should be in results');
		assert.include(matchIds, contactIds['3'], 'Contact 3 should be in results');
		assert.include(matchIds, contactIds['4'], 'Contact 4 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for an', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>an</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['2'], 'Contact 2 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for and', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>and</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['2'], 'Contact 2 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for are', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>are</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['3'], 'Contact 3 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for as', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>as</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['4'], 'Contact 4 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for at', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>at</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['4'], 'Contact 4 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for be', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>be</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['5'], 'Contact 5 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for but', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>but</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['3'], 'Contact 3 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for by', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>by</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['6'], 'Contact 6 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for for', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>for</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['13'], 'Contact 13 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for if', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>if</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['14'], 'Contact 14 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for in', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>in</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['13'], 'Contact 13 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for into', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>into</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response - XML has empty response (no t:select)
		assert.notExists(res.Fault, 'AutoComplete should not fault');
	});


	it('Sanity | Lucene AutoComplete test for is', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>is</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['14'], 'Contact 14 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for it', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>it</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['12'], 'Contact 12 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for no', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>no</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['12'], 'Contact 12 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for not', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>not</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['12'], 'Contact 12 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for of', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>of</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['13'], 'Contact 13 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for on', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>on</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['12'], 'Contact 12 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for or', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>or</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['11'], 'Contact 11 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for such', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>such</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['11'], 'Contact 11 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for that', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>that</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['11'], 'Contact 11 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for the', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>the</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['9'], 'Contact 9 should be in results');
		assert.include(matchIds, contactIds['5'], 'Contact 5 should be in results');
		assert.include(matchIds, contactIds['10'], 'Contact 10 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for their', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>their</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['10'], 'Contact 10 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for then', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>then</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['10'], 'Contact 10 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for there', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>there</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['5'], 'Contact 5 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for these', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>these</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['10'], 'Contact 10 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for they', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>they</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['9'], 'Contact 9 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for this', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>this</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['9'], 'Contact 9 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for to', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>to</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['8'], 'Contact 8 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for was', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>was</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['8'], 'Contact 8 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for will', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>will</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['7'], 'Contact 7 should be in results');
	});


	it('Sanity | Lucene AutoComplete test for with', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>with</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		const matchIds = matches.map(m => m.id);
		assert.include(matchIds, contactIds['7'], 'Contact 7 should be in results');
	});
});
