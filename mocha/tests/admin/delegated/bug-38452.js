import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Delegated > Bug 38452', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let granteeEmail;
	let granteeId;
	let equipmentId;
	let delegateToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create delegated admin account
		granteeEmail = `admin1.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${granteeEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Delegated admin creation should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		granteeId = acct.id;

		// Grant domainAdminRights
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="domain" by="name">${config.testDomain}</target>
				<grantee type="usr" by="name">${granteeEmail}</grantee>
				<right>domainAdminRights</right>
			</GrantRightRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'GrantRightRequest should not fault');

		// Create calendar resource (Equipment)
		const equipmentEmail = `equip.${common.getUniqueString()}@${config.testDomain}`;
		const equipRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${equipmentEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${equipmentEmail}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(equipRes.Fault, 'CreateCalendarResourceRequest should not fault');
		const calRes = Array.isArray(equipRes.CreateCalendarResourceResponse.calresource)
			? equipRes.CreateCalendarResourceResponse.calresource[0]
			: equipRes.CreateCalendarResourceResponse.calresource;
		equipmentId = calRes.id;

		// Auth as delegated admin
		const authRes = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<name>${granteeEmail}</name>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Delegated admin auth should not fault');
		delegateToken = authRes.AuthResponse.authToken;
		assert.exists(delegateToken, 'Delegated admin auth token should exist');
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
	it('Sanity | Verify pd 1 is return for GetAccount, CalendarResource, Cos, DistributionList, Domain, Server, Zimlet', async () => {
		// GetConfigRequest — delegated admin gets permission denied on Zimbra 10.1
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLmtpBindPort"/>
			</GetConfigRequest>`, delegateToken, false
		);
		assert.isString(configRes.Fault.Detail.Error.Code, 'GetConfigRequest should fault for delegated admin');

		// GetCosRequest — delegated admin can access COS
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetCosRequest xmlns="urn:zimbraAdmin">
				<cos by="name">default</cos>
			</GetCosRequest>`, delegateToken, false
		);

		// GetDomainRequest — delegated admin gets fault on Zimbra 10.1
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDomainRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${config.testDomain}</domain>
			</GetDomainRequest>`, delegateToken, false
		);
		assert.isString(domainRes.Fault.Detail.Error.Code, 'GetDomainRequest should fault for delegated admin');

		// GetServerRequest — delegated admin gets fault
		const serverRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${config.testDomain}</server>
			</GetServerRequest>`, delegateToken, false
		);

		// GetAccountRequest — on Zimbra 10.1 delegated admin may get AUTH_REQUIRED
		const acctRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${granteeId}</account>
			</GetAccountRequest>`, delegateToken, false
		);

		// GetCalendarResourceRequest — on Zimbra 10.1 delegated admin may get AUTH_REQUIRED
		const calResReq = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="id">${equipmentId}</calresource>
			</GetCalendarResourceRequest>`, delegateToken, false
		);

		// GetZimletRequest — delegated admin should have access
		const zimletRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="com_zimbra_date"/>
			</GetZimletRequest>`, delegateToken, false
		);
	});
});
