import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Calendar > Exchange2010 Getfreebusy', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Domain1, account1Domain2;
	const uid = common.getUniqueString();
	const domain1Name = `test${uid}a`;
	const domain2Name = `test${uid}b`;
	const exchangeHostname = '10.137.242.162';
	const exchangeUsername = 'soapautomation@zmexch.eng.vmware.com';
	const exchangeAdminUsername = 'administrator@zmexch.eng.vmware.com';
	const exchangeAdminPassword = 'z1mbr4Migration';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Domain1 = `test.${uid}a@${domain1Name}`;
		account1Domain2 = `test.${uid}b@${domain2Name}`;

		// Create domain1 with Exchange free-busy config
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain1Name}</name>
				<a n="zimbraFreebusyExchangeURL">https://${exchangeHostname}/EWS/Exchange.asmx</a>
				<a n="zimbraFreebusyExchangeAuthUsername">${exchangeAdminUsername}</a>
				<a n="zimbraFreebusyExchangeAuthPassword">${exchangeAdminPassword}</a>
				<a n="zimbraFreebusyExchangeAuthScheme">basic</a>
				<a n="zimbraFreebusyExchangeServerType">ews</a>
				<a n="zimbraFreebusyExchangeUserOrg">/o=First Organization/ou=Exchange Administrative Group (FsadYDIBOHF23SPDLT)</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create domain2 without exchange config
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domain2Name}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts in both domains
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Domain1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Domain2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
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
	it('Sanity | Get free busy of exchange user', async () => {
		// Login as domain1 user
		const acct1Auth = await soap.getAccountAuthToken(account1Domain1);

		// Get free busy of the exchange user
		const fbRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${exchangeUsername}" s="1423852200000" e="1424370600000">
			</GetFreeBusyRequest>`, acct1Auth
		);
		assert.notExists(fbRes.Fault, 'GetFreeBusyRequest should not fault');

		// Verify response contains user free-busy data
		const usr = Array.isArray(fbRes.GetFreeBusyResponse?.usr)
			? fbRes.GetFreeBusyResponse.usr : [fbRes.GetFreeBusyResponse?.usr];
		const exchangeUsr = usr.find(u => u?.id === exchangeUsername);
		assert.exists(exchangeUsr, 'Exchange user free-busy data should exist');
	});


	it('Sanity | Free busy configuration on domain and globalConfig', async () => {
		// Set invalid FB settings in globalConfig
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraFreebusyExchangeURL">https://${exchangeHostname}/EMSFK/Exchansssge.asmx</a>
				<a n="zimbraFreebusyExchangeAuthUsername">${exchangeAdminUsername}</a>
				<a n="zimbraFreebusyExchangeAuthPassword">${exchangeAdminPassword}</a>
				<a n="zimbraFreebusyExchangeAuthScheme">basic</a>
				<a n="zimbraFreebusyExchangeServerType">ews</a>
				<a n="zimbraFreebusyExchangeUserOrg">/o=First Organization/ou=Exchange Administrative Group (FsadYDIBOHF23SPDLT)</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Login as domain2 user (no domain-level FB config, should use invalid global)
		const acct2Auth = await soap.getAccountAuthToken(account1Domain2);
		const fbRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${exchangeUsername}" s="1423852200000" e="1424370600000">
			</GetFreeBusyRequest>`, acct2Auth
		);
		assert.notExists(fbRes1.Fault, 'GetFreeBusyRequest from domain2 should not fault');

		// Login as domain1 user (has valid domain-level FB config)
		const acct1Auth = await soap.getAccountAuthToken(account1Domain1);
		const fbRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${exchangeUsername}" s="1423852200000" e="1424370600000">
			</GetFreeBusyRequest>`, acct1Auth
		);
		assert.notExists(fbRes2.Fault, 'GetFreeBusyRequest from domain1 should not fault');

		// Fix global config to valid values
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraFreebusyExchangeURL">https://${exchangeHostname}/EWS/Exchange.asmx</a>
				<a n="zimbraFreebusyExchangeAuthUsername">${exchangeAdminUsername}</a>
				<a n="zimbraFreebusyExchangeAuthPassword">${exchangeAdminPassword}</a>
				<a n="zimbraFreebusyExchangeAuthScheme">basic</a>
				<a n="zimbraFreebusyExchangeServerType">ews</a>
				<a n="zimbraFreebusyExchangeUserOrg">/o=First Organization/ou=Exchange Administrative Group (FsadYDIBOHF23SPDLT)</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Verify both domains work with valid global config
		const acct2Auth2 = await soap.getAccountAuthToken(account1Domain2);
		const fbRes3 = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${exchangeUsername}" s="1423852200000" e="1424370600000">
			</GetFreeBusyRequest>`, acct2Auth2
		);
		assert.notExists(fbRes3.Fault, 'GetFreeBusyRequest from domain2 with fixed global should not fault');

		const acct1Auth2 = await soap.getAccountAuthToken(account1Domain1);
		const fbRes4 = await soap.makeSOAPEnvelopeAccount(
			`<GetFreeBusyRequest xmlns="urn:zimbraMail"
				uid="${exchangeUsername}" s="1423852200000" e="1424370600000">
			</GetFreeBusyRequest>`, acct1Auth2
		);
		assert.notExists(fbRes4.Fault, 'GetFreeBusyRequest from domain1 with fixed global should not fault');

		// Clean up: clear global FB settings
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraFreebusyExchangeURL"></a>
				<a n="zimbraFreebusyExchangeAuthUsername"></a>
				<a n="zimbraFreebusyExchangeAuthPassword"></a>
				<a n="zimbraFreebusyExchangeAuthScheme"></a>
				<a n="zimbraFreebusyExchangeServerType"></a>
				<a n="zimbraFreebusyExchangeUserOrg">/</a>
			</ModifyConfigRequest>`, adminAuthToken
		);
	});
});
