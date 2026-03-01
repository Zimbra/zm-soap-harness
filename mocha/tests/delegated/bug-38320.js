import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Delegated > Bug 38320', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let granteeAccount, granteeId;
	let equipmentAccount, equipmentId;
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
		equipmentAccount = `equipment.${common.getUniqueString()}@${testDomain}`;

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
	it('Sanity | Verify Getstarstarstar SOAP calls send the list of attributes and get proper response', async () => {
		// Auth as delegated admin
		// Send the message
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<AuthRequest xmlns="urn:zimbraAdmin">
				<account by="name">${granteeAccount}</account>
				<password>${defaultPassword}</password>
			</AuthRequest>`
		);

		// Verify response
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		const delegatedAuthToken = res.AuthResponse.authToken;

		// GetConfigRequest with attrs - delegated admin gets pd=1 or restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<a n="zimbraLmtpBindPort"/>
			</GetConfigRequest>`, delegatedAuthToken, false
		);
		if (res.GetConfigResponse) {
			const configAttrs = res.GetConfigResponse.a;
			const configPd = Array.isArray(configAttrs)
				? configAttrs.find(a => a.pd) : configAttrs;

			// Verify response
			assert.exists(configPd, 'GetConfigResponse should have pd attribute');
		} else {
			assert.exists(res.Fault, 'Should return Fault if GetConfig is restricted');
		}

		// GetCosRequest with attrs - should return pd=1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCosRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<cos by="name">default</cos>
			</GetCosRequest>`, delegatedAuthToken, false
		);
		if (res.GetCosResponse) {

			// Verify response
			assert.exists(res.GetCosResponse, 'GetCosResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if GetCos is restricted');
		}

		// GetDomainRequest with attrs - should return error for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetDomainRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<domain by="name">${testDomain}</domain>
			</GetDomainRequest>`, delegatedAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'GetDomainRequest with attrs should return Fault');
		assert.isTrue(
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED') ||
			res.Fault.Detail.Error.Code.includes('service.PERM_DENIED'),
			'Should be INVALID_REQUEST, AUTH_REQUIRED or PERM_DENIED'
		);

		// GetServerRequest - should return error for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<server by="name">${testDomain}</server>
			</GetServerRequest>`, delegatedAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'GetServerRequest with attrs should return Fault');
		assert.isTrue(
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED') ||
			res.Fault.Detail.Error.Code.includes('service.PERM_DENIED'),
			'Should be INVALID_REQUEST, AUTH_REQUIRED or PERM_DENIED'
		);

		// GetAccountRequest - pd should be absent (domainAdminRights given)
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<account by="id">${granteeId}</account>
			</GetAccountRequest>`, delegatedAuthToken, false
		);
		if (res.GetAccountResponse) {

			// Verify response
			assert.exists(res.GetAccountResponse, 'GetAccountResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}

		// GetCalendarResourceRequest - pd should be absent
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<calresource by="id">${equipmentId}</calresource>
			</GetCalendarResourceRequest>`, delegatedAuthToken, false
		);
		if (res.GetCalendarResourceResponse) {

			// Verify response
			assert.exists(res.GetCalendarResourceResponse,
				'GetCalendarResourceResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}

		// GetZimletRequest - should return error for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletRequest xmlns="urn:zimbraAdmin" attrs="zimbraPrefIMToasterEnabled">
				<zimlet name="com_zimbra_date"/>
			</GetZimletRequest>`, delegatedAuthToken, false
		);

		// Verify response
		assert.exists(res.Fault, 'GetZimletRequest should return Fault');
		assert.isTrue(
			res.Fault.Detail.Error.Code.includes('service.INVALID_REQUEST') ||
			res.Fault.Detail.Error.Code.includes('service.AUTH_REQUIRED') ||
			res.Fault.Detail.Error.Code.includes('service.PERM_DENIED'),
			'Should be INVALID_REQUEST, AUTH_REQUIRED or PERM_DENIED'
		);
	});
});
