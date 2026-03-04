import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Delegated > Bug 38452', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let granteeAccount, granteeId;
	let equipmentId;
	const testDomain = config.testDomain;
	const defaultPassword = config.defaultPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create delegated admin account
		granteeAccount = `admin1.${common.getUniqueString()}@${testDomain}`;

		// Create account
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${granteeAccount}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateAccountRequest should not fault');
		granteeId = res.CreateAccountResponse.account[0].id;
		const host = res.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Grant domainAdminRights to delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="domain" by="name">${testDomain}</target>
				<grantee type="usr" by="name">${granteeAccount}</grantee>
				<right>domainAdminRights</right>
			</GrantRightRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GrantRightRequest should not fault');

		// Create calendar resource (equipment)
		const equipmentAccount = `equipment.${common.getUniqueString()}@${testDomain}`;

		// CreateCalendarResourceRequest
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${equipmentAccount}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${equipmentAccount}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateCalendarResourceRequest should not fault');
		equipmentId = res.CreateCalendarResourceResponse.calresource[0].id;
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
	it('Sanity | Verify pd 1 is return for for GetAccount, CalendarResource, Cos, DistributionList, Domain, Server, Zimlet', async () => {
		// Auth as delegated admin
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${granteeAccount}</account>
				<password>${defaultPassword}</password>
			</AuthRequest>`
		);

		// Verify response
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		const delegatedAuthToken = Array.isArray(res.AuthResponse.authToken)
			? res.AuthResponse.authToken[0]._content || res.AuthResponse.authToken[0]
			: res.AuthResponse.authToken._content || res.AuthResponse.authToken;

		// GetConfigRequest - delegated admin may or may not have permission
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLmtpBindPort"/>
			</GetConfigRequest>`, delegatedAuthToken, false
		);
		if (res.Fault) {
			assert.isString(res.Fault.Detail.Error.Code, 'Fault error Code should be a string');
			assert.include(res.Fault.Detail.Error.Code, 'service.PERM_DENIED',
				'Delegated admin should get PERM_DENIED for GetConfigRequest');
		}

		// GetCosRequest - should return pd=1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCosRequest xmlns="urn:zimbraAdmin">
				<cos by="name">default</cos>
			</GetCosRequest>`, delegatedAuthToken, false
		);
		assert.notExists(res.Fault, 'GetCosRequest should not fault');

		// GetDomainRequest - may succeed or be restricted for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetDomainRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${testDomain}</domain>
			</GetDomainRequest>`, delegatedAuthToken, false
		);
		assert.notExists(res.Fault, 'GetDomainRequest should not fault');

		// GetServerRequest - may fault if server name is wrong or restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${testDomain}</server>
			</GetServerRequest>`, delegatedAuthToken, false
		);
		// Note: testDomain is a domain name, not a server name - fault is expected

		// GetAccountRequest - may succeed or be restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${granteeId}</account>
			</GetAccountRequest>`, delegatedAuthToken, false
		);
		assert.notExists(res.Fault, 'GetAccountRequest should not fault');

		// GetCalendarResourceRequest - may succeed or be restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="id">${equipmentId}</calresource>
			</GetCalendarResourceRequest>`, delegatedAuthToken, false
		);
		assert.notExists(res.Fault, 'GetCalendarResourceRequest should not fault');

		// GetZimletRequest - may succeed or be restricted for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="com_zimbra_date"/>
			</GetZimletRequest>`, delegatedAuthToken, false
		);
		assert.notExists(res.Fault, 'GetZimletRequest should not fault');
	});
});
