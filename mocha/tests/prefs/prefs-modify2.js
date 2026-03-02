import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Prefs > Prefs Modify2', function () {
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
	it('Smoke | Set zimbraPrefComposeFormat attribute to html, text', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set to html
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat">html</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(res.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');

		// Verify html
		let getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
		assert.equal(getRes.GetPrefsResponse._attrs.zimbraPrefComposeFormat, 'html', 'Value should match');

		// Set to text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat">text</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Verify text
		getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
		assert.equal(getRes.GetPrefsResponse._attrs.zimbraPrefComposeFormat, 'text', 'Value should match');
	});


	it('Regression | Set zimbraPrefComposeFormat to various invalid values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Negative number
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat">-5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for negative');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Decimal number
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat">6.5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for decimal');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Invalid number
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat">0088</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Alpha text
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat">abcd</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for alpha');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank value
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeFormat"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');
	});


	it('Sanity | Set zimbraPrefComposeInNewWindow attribute to true, false', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Verify TRUE
		let getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
		assert.equal(String(getRes.GetPrefsResponse._attrs.zimbraPrefComposeInNewWindow).toUpperCase(), 'TRUE', 'Value should match');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Verify FALSE
		getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
		assert.equal(String(getRes.GetPrefsResponse._attrs.zimbraPrefComposeInNewWindow).toUpperCase(), 'FALSE', 'Value should match');
	});


	it('Regression | Set zimbraPrefComposeInNewWindow to various invalid values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Negative number
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow">-5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for negative');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Decimal
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow">6.5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for decimal');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Invalid number
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow">0088</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid number');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Alpha
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow">abcd</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for alpha');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefComposeInNewWindow"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');
	});


	it('Sanity | Set zimbraPrefCalendarInitialView attribute to day, workWeek, week, month', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set day
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">day</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set workWeek
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">workWeek</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set week
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">week</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set month
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">month</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefCalendarInitialView to various invalid values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Negative
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">-5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for negative');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Decimal
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">6.5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for decimal');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Invalid number
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">0088</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Alpha
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView">abcd</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for alpha');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefCalendarInitialView"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');
	});


	it('Sanity | Set zimbraPrefUseTimeZoneListInCalendar attribute to TRUE, FALSE', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Set TRUE
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar">TRUE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');

		// Set FALSE
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault');
	});


	it('Regression | Set zimbraPrefUseTimeZoneListInCalendar to various invalid values', async () => {
		// Create the account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Negative
		let res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar">-5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for negative');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Decimal
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar">6.5</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for decimal');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Invalid number
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar">0088</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for invalid');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Alpha
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar">abcd</pref>
			</ModifyPrefsRequest>`, accountAuthToken, false
		);
		assert.exists(res.Fault, 'ModifyPrefsRequest should fault for alpha');
		assert.include(res.Fault.Detail.Error.Code, 'account.INVALID_ATTR_VALUE', 'Error Code should match');

		// Blank
		res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefUseTimeZoneListInCalendar"></pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(res.Fault, 'ModifyPrefsRequest should not fault for blank');
	});
});
