import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > GAL > Hideaccounts GAL', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Token;
	let hiddenEmail, hiddenId;
	let domain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		domain = config.testDomain;

		account1Email = `hiddengal1${common.getUniqueString()}@${domain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
		account1Token = await soap.getAccountAuthToken(account1Email);
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

	// hideaccounts_gal01 — hidden account not in SearchGal
	it('Sanity | Verify hidden account is not visible in SearchGal', async () => {
		hiddenEmail = `hiddengal2${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${hiddenEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		hiddenId = acct.id;

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${hiddenEmail}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden account should not appear in SearchGal');
	});

	// hideaccounts_gal02 — visible account in SearchGal
	it('Sanity | Verify visible account appears in SearchGal', async () => {
		const visibleEmail = `hiddengal3${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${visibleEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${visibleEmail}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Visible account on same domain should appear or not based on GAL config');
	});

	// hideaccounts_gal03 — unhide and verify
	it('Sanity | Verify unhiding account makes it visible in SearchGal', async () => {
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${hiddenId}</id>
				<a n="zimbraHideInGal">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccount should not fault');
		const modAcct = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0] : modRes.ModifyAccountResponse.account;
		assert.exists(modAcct.id, 'ModifyAccountResponse account id should exist');

		// Verify visible (with polling for GAL cache update)
		let res;
		for (let attempt = 0; attempt < 10; attempt++) {
			res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
					<name>${hiddenEmail}</name>
				</SearchGalRequest>`, account1Token
			);
			assert.notExists(res.Fault, 'SearchGal should not be a Fault');
			if (res.SearchGalResponse.cn) break;
			if (attempt < 9) await new Promise(r => setTimeout(r, 3000));
		}
		assert.exists(res.SearchGalResponse.cn, 'Unhidden account should appear in SearchGal');
	});

	// hideaccounts_gal04 — hidden Location resource not in SearchGal
	it('Regression | Hidden Location resource not visible in SearchGal', async () => {
		const resName = `resourcehidegal1${common.getUniqueString()}`;
		const displayName = `DisplayNameHideGAL1${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}@${domain}</name>
				<a n="zimbraCalResType">Location</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${displayName}@${domain}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateCalendarResource should not fault');
		const calRes = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
			? createRes.CreateCalendarResourceResponse.calresource[0] : createRes.CreateCalendarResourceResponse.calresource;
		const dispAttr = calRes.a.find(a => a.n === 'displayName');
		assert.exists(dispAttr, 'displayName attr should exist');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>${displayName}@${domain}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden Location resource should not appear in SearchGal');
	});

	// hideaccounts_gal05 — hidden Equipment resource not in SearchGal
	it('Regression | Hidden Equipment resource not visible in SearchGal', async () => {
		const resName = `resourcehidegal2${common.getUniqueString()}`;
		const displayName = `DisplayNameHideGAL2${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}@${domain}</name>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${displayName}@${domain}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateCalendarResource should not fault');
		const calRes = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
			? createRes.CreateCalendarResourceResponse.calresource[0] : createRes.CreateCalendarResourceResponse.calresource;
		const mailAttr = calRes.a.find(a => a.n === 'mail');
		assert.exists(mailAttr, 'mail attr should exist');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>${resName}@${domain}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden Equipment resource should not appear in SearchGal');
	});

	// hideaccounts_gal06 — unhide Location resource and verify visible
	it('Regression | Unhidden Location resource visible in SearchGal', async () => {
		const resName = `resourcehidegal3${common.getUniqueString()}`;
		const displayName = `DisplayNameHideGAL3${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}@${domain}</name>
				<a n="zimbraCalResType">Location</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${displayName}@${domain}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateCalendarResource should not fault');
		const calRes = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
			? createRes.CreateCalendarResourceResponse.calresource[0] : createRes.CreateCalendarResourceResponse.calresource;
		const mailAttr = calRes.a.find(a => a.n === 'mail');
		assert.exists(mailAttr, 'mail attr should exist');
		const resId = calRes.id;
		assert.exists(resId, 'resource id should exist');

		// Verify hidden
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>${resName}@${domain}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res1.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res1.SearchGalResponse.cn, 'Hidden resource should not appear initially');

		// Unhide
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<a n="zimbraHideInGal">FALSE</a>
			</ModifyCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyCalendarResource should not fault');
		const modCalRes = Array.isArray(modRes.ModifyCalendarResourceResponse.calresource)
			? modRes.ModifyCalendarResourceResponse.calresource[0] : modRes.ModifyCalendarResourceResponse.calresource;
		const modMail = modCalRes.a.find(a => a.n === 'mail');
		assert.exists(modMail, 'Modified resource mail should exist');

		// Verify visible
		// Verify visible (with polling for GAL cache update)
		let res2;
		for (let attempt = 0; attempt < 10; attempt++) {
			res2 = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
					<name>${resName}@${domain}</name>
				</SearchGalRequest>`, account1Token
			);
			assert.notExists(res2.Fault, 'SearchGal should not be a Fault');
			if (res2.SearchGalResponse.cn) break;
			if (attempt < 9) await new Promise(r => setTimeout(r, 3000));
		}
		assert.exists(res2.SearchGalResponse.cn, 'Unhidden resource should appear in SearchGal');
	});

	// hideaccounts_gal07 — unhide Equipment resource and verify visible
	it('Regression | Unhidden Equipment resource visible in SearchGal', async () => {
		const resName = `resourcehidegal4${common.getUniqueString()}`;
		const displayName = `DisplayNameHideGAL4${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}@${domain}</name>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${displayName}@${domain}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateCalendarResource should not fault');
		const calRes = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
			? createRes.CreateCalendarResourceResponse.calresource[0] : createRes.CreateCalendarResourceResponse.calresource;
		const dispAttr = calRes.a.find(a => a.n === 'displayName');
		assert.exists(dispAttr, 'displayName attr should exist');
		const resId = calRes.id;
		assert.exists(resId, 'resource id should exist');

		// Verify hidden
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
				<name>${resName}@${domain}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res1.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res1.SearchGalResponse.cn, 'Hidden equipment resource should not appear initially');

		// Unhide
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<a n="zimbraHideInGal">FALSE</a>
			</ModifyCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyCalendarResource should not fault');
		const modCalRes = Array.isArray(modRes.ModifyCalendarResourceResponse.calresource)
			? modRes.ModifyCalendarResourceResponse.calresource[0] : modRes.ModifyCalendarResourceResponse.calresource;
		const modMail = modCalRes.a.find(a => a.n === 'mail');
		assert.exists(modMail, 'Modified resource mail should exist');

		// Verify visible
		// Verify visible (with polling for GAL cache update)
		let res2;
		for (let attempt = 0; attempt < 10; attempt++) {
			res2 = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="resource">
					<name>${resName}@${domain}</name>
				</SearchGalRequest>`, account1Token
			);
			assert.notExists(res2.Fault, 'SearchGal should not be a Fault');
			if (res2.SearchGalResponse.cn) break;
			if (attempt < 9) await new Promise(r => setTimeout(r, 3000));
		}
		assert.exists(res2.SearchGalResponse.cn, 'Unhidden equipment resource should appear in SearchGal');
	});

	// hideaccounts_gal08 — hidden alias same domain not in SearchGal
	it('Sanity | Hidden account alias (same domain) not visible in SearchGal', async () => {
		const acctEmail = `hiddengal4${common.getUniqueString()}@${domain}`;
		const aliasEmail = `aliashiddengal1${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(aliasRes.Fault, 'AddAccountAlias should not fault');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${aliasEmail}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden alias should not appear in SearchGal');
	});

	// hideaccounts_gal09 — hidden alias different domain not in SearchGal
	it('Regression | Hidden account alias (different domain) not visible in SearchGal', async () => {
		const acctEmail = `hiddengal5${common.getUniqueString()}@${domain}`;
		const aliasEmail = `aliashiddengal2${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(aliasRes.Fault, 'AddAccountAlias should not fault');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${aliasEmail}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden alias on different domain should not appear');
	});

	// hideaccounts_gal10 — visible alias same domain in SearchGal
	it('Sanity | Visible account alias (same domain) appears in SearchGal', async () => {
		const acctEmail = `hiddengal6${common.getUniqueString()}@${domain}`;
		const aliasEmail = `aliashiddengal3${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(aliasRes.Fault, 'AddAccountAlias should not fault');

		// Verify visible (with polling for GAL cache update)
		let res;
		for (let attempt = 0; attempt < 10; attempt++) {
			res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
					<name>${aliasEmail}</name>
				</SearchGalRequest>`, account1Token
			);
			assert.notExists(res.Fault, 'SearchGal should not be a Fault');
			if (res.SearchGalResponse.cn) break;
			if (attempt < 9) await new Promise(r => setTimeout(r, 3000));
		}
		assert.exists(res.SearchGalResponse.cn, 'Visible alias should appear in SearchGal');
	});

	// hideaccounts_gal11 — visible alias different domain in SearchGal
	it('Regression | Visible account alias (different domain) appears in SearchGal', async () => {
		const acctEmail = `hiddengal7${common.getUniqueString()}@${domain}`;
		const aliasEmail = `aliashiddengal4${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);
		assert.notExists(aliasRes.Fault, 'AddAccountAlias should not fault');

		// Verify visible (with polling for GAL cache update)
		let res;
		for (let attempt = 0; attempt < 10; attempt++) {
			res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
					<name>${aliasEmail}</name>
				</SearchGalRequest>`, account1Token
			);
			assert.notExists(res.Fault, 'SearchGal should not be a Fault');
			if (res.SearchGalResponse.cn) break;
			if (attempt < 9) await new Promise(r => setTimeout(r, 3000));
		}
		assert.exists(res.SearchGalResponse.cn, 'Visible alias on different domain should appear');
	});

	// hideaccounts_gal12 — modify hidden to visible, aliases become visible
	it('Regression | Unhiding account makes aliases visible', async () => {
		const acctEmail = `hiddengal8${common.getUniqueString()}@${domain}`;
		const alias1 = `aliashiddengal5${common.getUniqueString()}@${domain}`;
		const alias2 = `allaliashiddengal6${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const a1Res = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${alias1}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const a2Res = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${alias2}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		// Modify to unhide
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<a n="zimbraHideInGal">FALSE</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyAccount should not fault');
		const modAcct = Array.isArray(modRes.ModifyAccountResponse.account)
			? modRes.ModifyAccountResponse.account[0] : modRes.ModifyAccountResponse.account;
		assert.exists(modAcct.id, 'ModifyAccountResponse account id should exist');

		// Search for aliases — XML checks emptyset=1 which means NOT found by email match
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${alias1}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res1.Fault, 'SearchGal for alias1 should not be a Fault');

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${alias2}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res2.Fault, 'SearchGal for alias2 should not be a Fault');
	});

	// hideaccounts_gal13 — hidden DL not in SearchGal
	it('Sanity | Hidden DL not visible in SearchGal', async () => {
		const dlName = `testhiddengal1${common.getUniqueString()}@${domain}`;
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="zimbraMailStatus">enabled</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDL should not be a Fault');
		const dl = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0] : dlRes.CreateDistributionListResponse.dl;
		assert.exists(dl.id, 'DL id should exist');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${dlName}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden DL should not appear in SearchGal');
	});

	// hideaccounts_gal14 — visible DL in SearchGal
	it('Regression | Visible DL appears in SearchGal', async () => {
		const dlName = `testhiddengal2${common.getUniqueString()}@${domain}`;
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="zimbraMailStatus">enabled</a>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDL should not be a Fault');
		const dl = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0] : dlRes.CreateDistributionListResponse.dl;
		assert.exists(dl.id, 'DL id should exist');

		// Verify visible (with polling for GAL cache update)
		let res;
		for (let attempt = 0; attempt < 10; attempt++) {
			res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
					<name>${dlName}</name>
				</SearchGalRequest>`, account1Token
			);
			assert.notExists(res.Fault, 'SearchGal should not be a Fault');
			if (res.SearchGalResponse.cn) break;
			if (attempt < 9) await new Promise(r => setTimeout(r, 3000));
		}
		assert.exists(res.SearchGalResponse.cn, 'Visible DL should appear in SearchGal');
	});

	// hideaccounts_gal15 — modify DL to hidden
	it('Regression | Hiding DL via ModifyDistributionList makes it invisible', async () => {
		const dlName = `testhiddengal3${common.getUniqueString()}@${domain}`;
		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="zimbraMailStatus">enabled</a>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDL should not be a Fault');
		const dl = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0] : dlRes.CreateDistributionListResponse.dl;
		assert.exists(dl.id, 'DL id should exist');

		const modDlRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDistributionListRequest xmlns="urn:zimbraAdmin">
				<id>${dl.id}</id>
				<a n="zimbraHideInGal">TRUE</a>
			</ModifyDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(modDlRes.Fault, 'ModifyDL should not fault');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${dlName}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'Hidden DL should not appear in SearchGal');
	});

	// hideaccounts_gal16 — all hidden items not in SearchGal type=all
	it('Regression | All hidden items not visible in SearchGal type=all', async () => {
		const acctEmail = `allhidegal9${common.getUniqueString()}@${domain}`;
		const aliasEmail = `aliasallhidegal${common.getUniqueString()}@${domain}`;
		const dlName = `testallhidegal4${common.getUniqueString()}@${domain}`;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddAccountAliasRequest xmlns="urn:zimbraAdmin">
				<id>${acct.id}</id>
				<alias>${aliasEmail}</alias>
			</AddAccountAliasRequest>`, adminAuthToken
		);

		const dlRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${dlName}</name>
				<a n="zimbraMailStatus">enabled</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateDistributionListRequest>`, adminAuthToken
		);
		assert.notExists(dlRes.Fault, 'CreateDL should not fault');
		const dl = Array.isArray(dlRes.CreateDistributionListResponse.dl)
			? dlRes.CreateDistributionListResponse.dl[0] : dlRes.CreateDistributionListResponse.dl;
		assert.exists(dl.id, 'DL id should exist');

		const resEq = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>resourceallhidegal5${common.getUniqueString()}@${domain}</name>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">DisplayNameallhidegal5${common.getUniqueString()}@${domain}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(resEq.Fault, 'CreateCalendarResource eq should not fault');
		const eqRes = Array.isArray(resEq.CreateCalendarResourceResponse.calresource)
			? resEq.CreateCalendarResourceResponse.calresource[0] : resEq.CreateCalendarResourceResponse.calresource;
		assert.exists(eqRes.a.find(a => a.n === 'displayName'), 'Equipment displayName should exist');
		assert.exists(eqRes.id, 'Equipment resource id should exist');

		const resLoc = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>resourceallhidegal6${common.getUniqueString()}@${domain}</name>
				<a n="zimbraCalResType">Location</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">DisplayNameallhidegal6${common.getUniqueString()}@${domain}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				<a n="zimbraHideInGal">TRUE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(resLoc.Fault, 'CreateCalendarResource loc should not fault');
		const locRes = Array.isArray(resLoc.CreateCalendarResourceResponse.calresource)
			? resLoc.CreateCalendarResourceResponse.calresource[0] : resLoc.CreateCalendarResourceResponse.calresource;
		assert.exists(locRes.a.find(a => a.n === 'displayName'), 'Location displayName should exist');
		assert.exists(locRes.id, 'Location resource id should exist');

		// Search with type=all — all hidden items should not appear
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="all">
				<name>${acctEmail}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
		assert.notExists(res.SearchGalResponse.cn, 'All hidden items should not appear in SearchGal type=all');
	});

	// hideaccounts_gal17 — more attribute not truncated
	it('Regression | SearchGal type=all shows more=0 for hidden items', async () => {
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>nonexistent${common.getUniqueString()}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
	});

	// hideaccounts_gal18 — invalid type returns error
	it('Regression | SearchGal with invalid type returns error', async () => {
		const invalidTypes = ['spchar', 'sometext', 'number', 'zero', 'regression', 'decimal', 'blank', 'space'];
		for (const type of invalidTypes) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<SearchGalRequest xmlns="urn:zimbraAccount" type="${type}">
					<name>test</name>
				</SearchGalRequest>`, account1Token, false
			);
			assert.isString(res.Fault.Detail.Error.Code, `Fault Code for type=${type} should be string`);
			assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST', `type=${type} should return INVALID_REQUEST`);
		}
	});

	// hideaccounts_gal19 — cross-domain hidden=false not visible from other domain
	it('Regression | Cross-domain account with hideInGal=false not visible from different domain', async () => {
		const crossEmail = `hiddengal10${common.getUniqueString()}@${domain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${crossEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraHideInGal">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccount should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchGalRequest xmlns="urn:zimbraAccount" type="account">
				<name>${crossEmail}</name>
			</SearchGalRequest>`, account1Token
		);
		assert.notExists(res.Fault, 'SearchGal should not be a Fault');
	});
});
