import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Certificate > Get Cert Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let serverId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Get server id
		const serverRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${config.serverHost}</server>
			</GetServerRequest>`, adminAuthToken
		);
		assert.notExists(serverRes.Fault, 'GetServerRequest should not fault');
		const server = Array.isArray(serverRes.GetServerResponse.server)
			? serverRes.GetServerResponse.server[0] : serverRes.GetServerResponse.server;
		serverId = server.id;
		assert.exists(serverId, 'Server id should exist');
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
	it('Smoke | Test for GetCertRequest when type mailboxd', async () => {
		// Get certificate for mailboxd type
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="mailboxd" option="self" server="${serverId}" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken
		);

		// Verify certificate response
		assert.notExists(res.Fault, 'GetCertRequest should not fault');
		const cert = Array.isArray(res.GetCertResponse.cert)
			? res.GetCertResponse.cert[0] : res.GetCertResponse.cert;
		assert.equal(cert.server, config.serverHost, 'cert server should match server host');
		assert.equal(cert.type, 'mailboxd', 'cert type should be mailboxd');
		assert.exists(cert.issuer, 'cert issuer should exist');
		const issuer = Array.isArray(cert.issuer) ? cert.issuer[0]._content : cert.issuer;
		assert.isString(issuer, 'issuer should be a string');
	});


	it('Sanity | Test for GetCertRequest when type proxy', async () => {
		// Get certificate for proxy type
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="proxy" option="self" server="${serverId}" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken
		);

		// Verify certificate response
		assert.notExists(res.Fault, 'GetCertRequest should not fault');
		const cert = Array.isArray(res.GetCertResponse.cert)
			? res.GetCertResponse.cert[0] : res.GetCertResponse.cert;
		assert.equal(cert.server, config.serverHost, 'cert server should match server host');
		assert.equal(cert.type, 'proxy', 'cert type should be proxy');
		assert.exists(cert.issuer, 'cert issuer should exist');
		const issuer = Array.isArray(cert.issuer) ? cert.issuer[0]._content : cert.issuer;
		assert.isString(issuer, 'issuer should be a string');
	});


	it('Sanity | Test for GetCertRequest when type ldap', async () => {
		// Get certificate for ldap type
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="ldap" option="self" server="${serverId}" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken
		);

		// Verify certificate response
		assert.notExists(res.Fault, 'GetCertRequest should not fault');
		const cert = Array.isArray(res.GetCertResponse.cert)
			? res.GetCertResponse.cert[0] : res.GetCertResponse.cert;
		assert.equal(cert.server, config.serverHost, 'cert server should match server host');
		assert.equal(cert.type, 'ldap', 'cert type should be ldap');
		assert.exists(cert.issuer, 'cert issuer should exist');
		const issuer = Array.isArray(cert.issuer) ? cert.issuer[0]._content : cert.issuer;
		assert.isString(issuer, 'issuer should be a string');
	});


	it('Sanity | Test for GetCertRequest with blank type', async () => {
		// Get certificate with blank type
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="" option="self" server="${serverId}" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Sanity | Test for GetCertRequest with blank server', async () => {
		// Get certificate with blank server
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="ldap" option="self" server="" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken, false
		);

		// Verify fault code
		assert.isString(res.Fault.Detail.Error.Code, 'Should return a Fault');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Sanity | Test for GetCertRequest with negative value for type,server', async () => {
		// Get certificate with negative type value
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="-1111" option="self" server="${serverId}" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should return a Fault for negative type');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Get certificate with negative server value
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="ldap" option="self" server="-1111" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should return a Fault for negative server');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Sanity | Test for GetCertRequest with type ,server as alphabets', async () => {
		// Get certificate with alphabetic type value
		const res1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="aaa" option="self" server="${serverId}" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken, false
		);
		assert.isString(res1.Fault.Detail.Error.Code, 'Should return a Fault for invalid type');
		assert.include(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Get certificate with alphabetic server value
		const res2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCertRequest type="ldap" option="self" server="aaaa" xmlns="urn:zimbraAdmin">
			</GetCertRequest>`, adminAuthToken, false
		);
		assert.isString(res2.Fault.Detail.Error.Code, 'Should return a Fault for invalid server');
		assert.include(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});
});
