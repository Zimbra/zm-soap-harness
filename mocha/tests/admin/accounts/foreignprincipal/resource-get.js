import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Foreignprincipal > Resource Get', function () {
	let adminAuthToken;
	let cosId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin"><name xmlns="">cos${common.getUniqueString()}</name></CreateCosRequest>`, adminAuthToken
		);
		cosId = cosRes.CreateCosResponse.cos[0].id;
	});

	async function createResource(fp, fpExtra) {
		const resName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		let fpAttrs = `<a n="zimbraForeignPrincipal">${fp}</a>`;
		if (fpExtra) fpAttrs += `\n<a n="zimbraForeignPrincipal">${fpExtra}</a>`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				${fpAttrs}
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		return { id: response.CreateCalendarResourceResponse.calresource[0].id, name: resName };
	}

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Get an calresource by id = foreign principal attribute', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const res = await createResource(fp);
		await common.sleep(2000);
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(getRes.GetCalendarResourceResponse,
			'GetCalendarResourceResponse should exist');
		assert.equal(getRes.GetCalendarResourceResponse.calresource[0].id, res.id);
	});


	it('Sanity | Get an account with two foreign principal attributes by id = foreign principal', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const res = await createResource(fp1, fp2);

		await common.sleep(2000);
		const g1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp1}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.equal(g1.GetCalendarResourceResponse.calresource[0].id, res.id);

		const g2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp2}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.equal(g2.GetCalendarResourceResponse.calresource[0].id, res.id);
	});


	it('Sanity | Verify that an account with a foreign principal can still be searched by name and zimbra ID', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const res = await createResource(fp);

		const byId = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="id">${res.id}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.equal(byId.GetCalendarResourceResponse.calresource[0].id, res.id);

		const byName = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="name">${res.name}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.equal(byName.GetCalendarResourceResponse.calresource[0].id, res.id);
	});


	it('Functional | GetCalendarResourceRequest by "id = foreignPrincipal" and applyCos=1', async () => {
		const fp = `test:${common.getUniqueString()}`;
		await createResource(fp);
		await common.sleep(2000);
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin" applyCos="1">
				<calresource by="foreignPrincipal">${fp}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(getRes.GetCalendarResourceResponse,
			'GetCalendarResourceResponse should exist');
	});


	it('Functional | Get a deleted calresource by "id = foreignPrincipal" - should return NO_SUCH_ACCOUNT', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const res = await createResource(fp);

		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteCalendarResourceRequest xmlns="urn:zimbraAdmin"><id>${res.id}</id></DeleteCalendarResourceRequest>`, adminAuthToken
		);

		await common.sleep(2000);
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(getRes.Fault);
		assert.include(getRes.Fault.Detail.Error.Code, 'NO_SUCH_CALENDAR_RESOURCE');
	});


	it('Functional | Get resources with the same foreign principal attributes', async () => {
		const fp = `test:${common.getUniqueString()}`;
		await createResource(fp);
		await createResource(fp);

		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="foreignPrincipal">${fp}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.exists(getRes.Fault);
	});
});
