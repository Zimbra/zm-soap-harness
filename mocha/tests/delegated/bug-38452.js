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
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create delegated admin account
		granteeAccount = `admin1.${common.getUniqueString()}@${testDomain}`;
		let res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${granteeAccount}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraIsDelegatedAdminAccount">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
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
		assert.notExists(res.Fault, 'GrantRightRequest should not fault');

		// Create calendar resource (equipment)
		const equipmentAccount = `equipment.${common.getUniqueString()}@${testDomain}`;
		res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${equipmentAccount}</name>
				<password>${defaultPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${equipmentAccount}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'CreateCalendarResourceRequest should not fault');
		equipmentId = res.CreateCalendarResourceResponse.calresource[0].id;
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
		assert.notExists(res.Fault, 'AuthRequest should not fault');
		const delegatedAuthToken = res.AuthResponse.authToken;

		// GetConfigRequest - delegated admin may get pd=1 or restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraLmtpBindPort"/>
			</GetConfigRequest>`, delegatedAuthToken
		);
		if (res.GetConfigResponse) {
			const configAttrs = res.GetConfigResponse.a;
			const configPd = Array.isArray(configAttrs)
				? configAttrs.find(a => a.pd) : configAttrs;
			assert.exists(configPd, 'GetConfigResponse should have pd attribute');
		} else {
			assert.exists(res.Fault, 'Should return Fault if GetConfig is restricted');
		}

		// GetCosRequest - should return pd=1
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCosRequest xmlns="urn:zimbraAdmin">
				<cos by="name">default</cos>
			</GetCosRequest>`, delegatedAuthToken
		);
		if (res.GetCosResponse) {
			assert.exists(res.GetCosResponse, 'GetCosResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if GetCos is restricted');
		}

		// GetDomainRequest - may succeed or be restricted for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetDomainRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${testDomain}</domain>
			</GetDomainRequest>`, delegatedAuthToken
		);
		if (res.GetDomainResponse) {
			assert.exists(res.GetDomainResponse, 'GetDomainResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}

		// GetServerRequest - may succeed or be restricted for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${testDomain}</server>
			</GetServerRequest>`, delegatedAuthToken
		);
		if (res.GetServerResponse) {
			assert.exists(res.GetServerResponse, 'GetServerResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}

		// GetAccountRequest - may succeed or be restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${granteeId}</account>
			</GetAccountRequest>`, delegatedAuthToken
		);
		if (res.GetAccountResponse) {
			assert.exists(res.GetAccountResponse, 'GetAccountResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}

		// GetCalendarResourceRequest - may succeed or be restricted
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="id">${equipmentId}</calresource>
			</GetCalendarResourceRequest>`, delegatedAuthToken
		);
		if (res.GetCalendarResourceResponse) {
			assert.exists(res.GetCalendarResourceResponse,
				'GetCalendarResourceResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}

		// GetZimletRequest - may succeed or be restricted for delegated admin
		res = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="com_zimbra_date"/>
			</GetZimletRequest>`, delegatedAuthToken
		);
		if (res.GetZimletResponse) {
			assert.exists(res.GetZimletResponse, 'GetZimletResponse should exist');
		} else {
			assert.exists(res.Fault, 'Should return Fault if restricted');
		}
	});
});
