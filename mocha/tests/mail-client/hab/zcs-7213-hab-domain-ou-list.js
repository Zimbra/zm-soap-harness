import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > HAB > ZCS-7213 HAB DomainOUList', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	const domainName = `test${uid}.com`;
	const invalidDomainName = `invalid${uid}.com`;
	const ou1Name = `ZimbraOU${uid}1`;
	const ou2Name = `ZimbraOU${uid}2`;
	const ou3Name = `ZimbraOU${uid}3`;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
				<a n="zimbraNotes">test of adding an OU</a>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>test1${uid}@${domainName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Sanity | Create a multiple OUs in a domain', async () => {
		// Create 3 OUs
		const ou1Res = await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou1Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
		assert.notExists(ou1Res.Fault, 'HABOrgUnitRequest for OU1 should not fault');

		const ou2Res = await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou2Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
		assert.notExists(ou2Res.Fault, 'HABOrgUnitRequest for OU2 should not fault');

		const ou3Res = await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="create" name="${ou3Name}" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
		assert.notExists(ou3Res.Fault, 'HABOrgUnitRequest for OU3 should not fault');
	});


	it.skip('Sanity | Fire HABOrgUnitRequest to list OUs for above domain', async () => {
		const listRes = await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="list" xmlns="urn:zimbraAdmin">
				<domain by="name">${domainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
		assert.notExists(listRes.Fault, 'HABOrgUnitRequest list should not fault');
		assert.exists(listRes.HABOrgUnitResponse, 'HABOrgUnitResponse should exist');
	});


	it('Sanity | Fire HABOrgUnitRequest to list OUs for a non-existent domain', async () => {
		const listRes = await soap.makeSOAPEnvelopeAdmin(
			`<HABOrgUnitRequest op="list" xmlns="urn:zimbraAdmin">
				<domain by="name">${invalidDomainName}</domain>
			</HABOrgUnitRequest>`, adminAuthToken
		);
		assert.exists(listRes.Fault, 'HABOrgUnitRequest for invalid domain should fault');
	});
});
