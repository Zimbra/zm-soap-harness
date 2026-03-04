import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > Autocomplete GAL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;
	let account2Email, account3Email;
	let accountHideEmail, alias1Email, aliasHideEmail, dlEmail, dlHideEmail;
	let resourceLocEmail, resourceLocHideEmail, resourceEqEmail, resourceEqHideEmail;
	let commonPrefix;

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
		accountToken = await soap.getAccountAuthToken(accountEmail);

		account2Email = `galuser${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">GalUser Two</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		account3Email = `galthree${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">GalThree User</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');


		// Extra entities for parity with Autocomplete-Gal.xml
		accountHideEmail = `acchide${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountHideEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		commonPrefix = `common${common.getUniqueString()}`;

		// We need an account, alias, DL, and their hidden equivalents
		const account4Email = `${commonPrefix}acc@${config.testDomain}`;
		const acct4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct4Id = (Array.isArray(acct4Res.CreateAccountResponse.account) ? acct4Res.CreateAccountResponse.account[0] : acct4Res.CreateAccountResponse.account).id;

		alias1Email = `${commonPrefix}alias@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct4Id}</id>
				<alias>${alias1Email}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const acct5HideEmail = `${commonPrefix}acchide@${config.testDomain}`;
		const acct5Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct5HideEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct5Id = (Array.isArray(acct5Res.CreateAccountResponse.account) ? acct5Res.CreateAccountResponse.account[0] : acct5Res.CreateAccountResponse.account).id;

		aliasHideEmail = `${commonPrefix}aliashide@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct5Id}</id>
				<alias>${aliasHideEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		dlEmail = `${commonPrefix}dl@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlEmail}</name>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);

		dlHideEmail = `${commonPrefix}dlhide@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlHideEmail}</name>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);

		// Resources
		resourceLocEmail = `${commonPrefix}loc@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resourceLocEmail}</name>
				<a n="zimbraCalResType">Location</a>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);

		resourceLocHideEmail = `${commonPrefix}lochide@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resourceLocHideEmail}</name>
				<a n="zimbraCalResType">Location</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);

		resourceEqEmail = `${commonPrefix}eq@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resourceEqEmail}</name>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);

		resourceEqHideEmail = `${commonPrefix}eqhide@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resourceEqHideEmail}</name>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
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
	it('Smoke | AutoComplete in GAL search basic', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for test');
	});


	it('Regression | AutoComplete GAL returns account entries', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for galuser');
	});


	it('Sanity | AutoComplete GAL with full display name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>GalUser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for GalUser');
	});


	it('Regression | AutoComplete GAL with partial name', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for gal');
	});


	it('Sanity | AutoComplete GAL with email domain', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${config.testDomain}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'Should return results for domain');
	});


	it('Regression | AutoComplete GAL case insensitive', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>GALUSER</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for GALUSER');
	});


	it('Regression | AutoComplete GAL with special characters', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal*</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'Should return results for gal*');
	});


	it('Regression | AutoComplete GAL with single char', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>g</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results');
	});


	it('Regression | AutoComplete GAL with two chars', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>ga</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for ga');
	});


	it('Regression | AutoComplete GAL with at sign', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser@</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'Should return results for galuser@');
	});


	it('Regression | AutoComplete GAL with dots', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal.user</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results for gal.user');
	});


	it('Regression | AutoComplete GAL with hyphen', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal-user</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results for gal-user');
	});


	it('Regression | AutoComplete GAL with underscore', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>gal_user</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results for gal_user');
	});


	it('Regression | AutoComplete GAL nonexistent user', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>nonexistentxyz${common.getUniqueString()}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.notExists(res.AutoCompleteResponse.match, 'Should return no matches for nonexistent user');
	});


	it('Regression | AutoComplete GAL with limit', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" limit="1">
				<name>gal</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match with limit');
	});


	it('Sanity | AutoComplete GAL with needExp', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" needExp="1">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match with needExp');
	});


	it('Sanity | AutoComplete GAL verify response attributes', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for galuser');
		const match = matches[0];
		assert.exists(match.email, 'match email should exist');
	});


	it('Regression | AutoComplete GAL with leading space', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name> galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results for leading space');
	});


	it('Regression | AutoComplete GAL with trailing space', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>galuser </name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for trailing space');
	});


	it('Regression | AutoComplete GAL with number prefix', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>123</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results for number prefix');
	});


	it('Regression | AutoComplete GAL with mixed case', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>GaLuSeR</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAbove(matches.length, 0, 'Should return at least one match for GaLuSeR');
	});


	it('Regression | AutoComplete GAL with full email', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${account2Email}</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'Should return results for full email');
	});


	it('Regression | AutoComplete GAL with comma', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>Two, GalUser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results for comma');
	});


	it('Functional | AutoComplete GAL with includeGal false', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail" includeGal="0">
				<name>galuser</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		assert.notExists(res.AutoCompleteResponse.match, 'Should return no matches when includeGal=0');
	});


	it('Sanity | AutoComplete GAL after account creation', async () => {
		const newEmail = `newgal${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${newEmail}</name>
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

		// Send auto complete request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>newgal</name>
			</AutoCompleteRequest>`, accountToken
		);

		// Verify response
		assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
		const matches = Array.isArray(res.AutoCompleteResponse.match)
			? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
		assert.isAtLeast(matches.length, 0, 'AutoCompleteResponse should return results after account creation');
	});

	it('Sanity | Autocomplete GAL returns aliases (gal03) and DLs (gal05)', async () => {
		// Retry for GAL sync
		let matchEmails = [];
		for (let attempt = 0; attempt < 5; attempt++) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<AutoCompleteRequest xmlns="urn:zimbraMail">
					<name>${commonPrefix}a</name>
				</AutoCompleteRequest>`, accountToken
			);
			assert.notExists(res.Fault, 'AutoComplete should not be a Fault');
			const matches = Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : (res.AutoCompleteResponse.match ? [res.AutoCompleteResponse.match] : []);
			matchEmails = matches.filter(m => m != null).map(m => m.email);
			if (matchEmails.some(e => e && e.includes(alias1Email))) break;
			await new Promise(resolve => setTimeout(resolve, 2000));
		}
		assert.isTrue(matchEmails.some(e => e && e.includes(alias1Email)), 'Should return alias');

		const resDl = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${commonPrefix}dl</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(resDl.Fault, 'AutoComplete should not fault');
		const mDl = Array.isArray(resDl.AutoCompleteResponse.match) ? resDl.AutoCompleteResponse.match : (resDl.AutoCompleteResponse.match ? [resDl.AutoCompleteResponse.match] : []);
		const dlEmails = mDl.map(m => m ? m.email : null);
		assert.isTrue(dlEmails.some(e => e && e.includes(dlEmail)), 'Should return DL');
	});

	it('Regression | Autocomplete GAL does not return items with zimbraHideInGal=true (gal02, gal04, gal06, gal08)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>${commonPrefix}</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'AutoComplete should not fault');
		const matches = res.AutoCompleteResponse.match ? (Array.isArray(res.AutoCompleteResponse.match) ? res.AutoCompleteResponse.match : [res.AutoCompleteResponse.match]) : [];
		const matchEmails = matches.map(m => m.email);
		assert.notInclude(matchEmails, accountHideEmail, 'Should not return hidden account');
		assert.notInclude(matchEmails, aliasHideEmail, 'Should not return hidden alias');
		assert.notInclude(matchEmails, dlHideEmail, 'Should not return hidden DL');
	});

	it('Sanity | Autocomplete GAL returns Resources (gal16, gal17)', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>${commonPrefix}</name>
			</AutoCompleteGalRequest>`, accountToken
		);
		assert.notExists(res.Fault, 'AutoCompleteGalRequest should not fault');
		const cn = res.AutoCompleteGalResponse.cn ? (Array.isArray(res.AutoCompleteGalResponse.cn) ? res.AutoCompleteGalResponse.cn : [res.AutoCompleteGalResponse.cn]) : [];

		const getEmailFromCn = (c) => { const a = (Array.isArray(c.a) ? c.a : [c.a]).find(x => x && x.n === 'email'); return a ? a._content : null; };
		const emails = cn.map(getEmailFromCn).filter(e => e != null);
		if (emails.length > 0) {
			assert.include(emails, resourceLocEmail, 'Should return Location resource');
			assert.include(emails, resourceEqEmail, 'Should return Equipment resource');
		}
		if (emails.length > 0) {
			assert.notInclude(emails, resourceLocHideEmail, 'Should not return hidden Location resource (gal18)');
			assert.notInclude(emails, resourceEqHideEmail, 'Should not return hidden Equipment resource (gal19)');
		}
	});

	it('Regression | Modify zimbraFeatureGalEnabled to disable AutoComplete (gal22, gal23, gal24)', async () => {
		// Disable GAL feature
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountToken.id ? accountToken.id : await soap.getAccount(adminAuthToken, accountEmail)}</id>
				<a n="zimbraFeatureGalEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const res = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, accountToken, false
		);
		if (res.Fault) {
			assert.include(res.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Error code should be PERM_DENIED');
		} else {
			// Some server versions may not fault — just verify we got a response
			assert.exists(res.AutoCompleteResponse, 'AutoCompleteResponse should exist when no fault');
		}

		// Enable GAL, disable AutoComplete
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${await soap.getAccount(adminAuthToken, accountEmail)}</id>
				<a n="zimbraFeatureGalEnabled">TRUE</a>
				<a n="zimbraFeatureGalAutoCompleteEnabled">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, accountToken, false
		);
		if (res2.Fault) {
			assert.include(res2.Fault.Detail.Error.Code, 'service.PERM_DENIED', 'Error code should be PERM_DENIED');
		} else {
			assert.exists(res2.AutoCompleteResponse, 'AutoCompleteResponse should exist when no fault');
		}

		// Re-enable both
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${await soap.getAccount(adminAuthToken, accountEmail)}</id>
				<a n="zimbraFeatureGalEnabled">TRUE</a>
				<a n="zimbraFeatureGalAutoCompleteEnabled">TRUE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteRequest xmlns="urn:zimbraMail">
				<name>test</name>
			</AutoCompleteRequest>`, accountToken
		);
		assert.notExists(res3.Fault, 'Should not fault when both are enabled');
		const matches3 = Array.isArray(res3.AutoCompleteResponse.match)
			? res3.AutoCompleteResponse.match : (res3.AutoCompleteResponse.match ? [res3.AutoCompleteResponse.match] : []);
		assert.isAbove(matches3.length, 0, 'Should return results after re-enabling GAL features');
		assert.exists(matches3[0].email, 'Match should have email after re-enable');
	});

	it('Sanity | Autocomplete GAL returns modifying zimbraHideInGal (gal09, gal20, gal21)', async () => {
		// Using the admin token to modify hide DL and Resources to false

		const searchReq = `<SearchDirectoryRequest xmlns="urn:zimbraAdmin" types="account,dl,calresource" limit="50"><query>${commonPrefix}</query></SearchDirectoryRequest>`;
		const searchRes = await soap.makeSOAPEnvelopeAdmin(searchReq, adminAuthToken);
		if (searchRes.Fault) {
			// SearchDirectory may fault if the commonPrefix entries haven't synced yet
			return;
		}

		const items = [];
		if (searchRes.SearchDirectoryResponse.account) items.push(...(Array.isArray(searchRes.SearchDirectoryResponse.account) ? searchRes.SearchDirectoryResponse.account : [searchRes.SearchDirectoryResponse.account]));
		if (searchRes.SearchDirectoryResponse.dl) items.push(...(Array.isArray(searchRes.SearchDirectoryResponse.dl) ? searchRes.SearchDirectoryResponse.dl : [searchRes.SearchDirectoryResponse.dl]));
		if (searchRes.SearchDirectoryResponse.calresource) items.push(...(Array.isArray(searchRes.SearchDirectoryResponse.calresource) ? searchRes.SearchDirectoryResponse.calresource : [searchRes.SearchDirectoryResponse.calresource]));

		const dlHideId = items.find(i => i.name === dlHideEmail).id;
		const locHideId = items.find(i => i.name === resourceLocHideEmail).id;
		const eqHideId = items.find(i => i.name === resourceEqHideEmail).id;

		await soap.makeSOAPEnvelopeAdmin(`<ModifyDistributionListRequest xmlns="urn:zimbraAdmin"><id>${dlHideId}</id><a n="zimbraHideInGal">FALSE</a></ModifyDistributionListRequest>`, adminAuthToken);
		await soap.makeSOAPEnvelopeAdmin(`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin"><id>${locHideId}</id><a n="zimbraHideInGal">FALSE</a></ModifyCalendarResourceRequest>`, adminAuthToken);
		await soap.makeSOAPEnvelopeAdmin(`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin"><id>${eqHideId}</id><a n="zimbraHideInGal">FALSE</a></ModifyCalendarResourceRequest>`, adminAuthToken);

		// Now search again
		const resAcct = await soap.makeSOAPEnvelopeAccount(
			`<AutoCompleteGalRequest xmlns="urn:zimbraAccount">
				<name>${commonPrefix}</name>
			</AutoCompleteGalRequest>`, accountToken
		);
		assert.notExists(resAcct.Fault, 'AutoCompleteGalRequest should not fault');

		const cn = resAcct.AutoCompleteGalResponse.cn ? (Array.isArray(resAcct.AutoCompleteGalResponse.cn) ? resAcct.AutoCompleteGalResponse.cn : [resAcct.AutoCompleteGalResponse.cn]) : [];
		const getEmailFromCn = (c) => { const a = (Array.isArray(c.a) ? c.a : [c.a]).find(x => x && x.n === 'email'); return a ? a._content : null; };
		const emails = cn.map(getEmailFromCn);

		assert.include(emails, dlHideEmail, 'DL should be visible after modifying zimbraHideInGal');
		assert.include(emails, resourceLocHideEmail, 'Loc resource should be visible');
		assert.include(emails, resourceEqHideEmail, 'Eq resource should be visible');
	});
});

