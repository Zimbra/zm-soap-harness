import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Foreignprincipal > Resource Modify', function () {
	let adminAuthToken;
	let cosId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// CreateCosRequest
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin"><name xmlns="">cos${common.getUniqueString()}</name></CreateCosRequest>`, adminAuthToken
		);
		cosId = cosRes.CreateCosResponse.cos[0].id;
	});

	async function createResource(fp) {
		const resName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const fpAttrXml = fp ? `<a n="zimbraForeignPrincipal">${fp}</a>` : '';

		// CreateCalendarResourceRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
				${fpAttrXml}
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		const calresource = Array.isArray(response.CreateCalendarResourceResponse?.calresource)
			? response.CreateCalendarResourceResponse.calresource[0]
			: response.CreateCalendarResourceResponse?.calresource;
		return calresource?.id;
	}

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Modify the foreign principal attribute', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const resId = await createResource(fp1);

		// ModifyCalendarResourceRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<a n="zimbraForeignPrincipal">${fp2}</a>
			</ModifyCalendarResourceRequest>`, adminAuthToken
		);

		// Old FP should fail
		await common.sleep(2000);

		// GetCalendarResourceRequest
		const getOld = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp1}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.exists(getOld.Fault, 'Old FP should no longer work');

		// New FP should succeed
		await common.sleep(2000);

		// GetCalendarResourceRequest
		const getNew = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp2}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);

		// Verify response
		assert.equal(getNew.GetCalendarResourceResponse.calresource[0].id, resId);
	});


	it('Sanity | Add the foreign principal attribute to an existing account', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const resId = await createResource(null);

		// ModifyCalendarResourceRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<a n="zimbraForeignPrincipal">${fp}</a>
			</ModifyCalendarResourceRequest>`, adminAuthToken
		);

		await common.sleep(2000);

		// GetCalendarResourceRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);

		// Verify response
		assert.equal(getRes.GetCalendarResourceResponse.calresource[0].id, resId);
	});


	it('Sanity | Add a second foreign principal to the account', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const resId = await createResource(fp1);

		// ModifyCalendarResourceRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<a n="+zimbraForeignPrincipal">${fp2}</a>
			</ModifyCalendarResourceRequest>`, adminAuthToken
		);


		await common.sleep(2000);

		// GetCalendarResourceRequest
		const g1 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp1}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);
		const getResId = r => {
			const cr = r.GetCalendarResourceResponse?.calresource;
			return Array.isArray(cr) ? cr[0].id : cr?.id;
		};

		// Verify response
		assert.equal(getResId(g1), resId);

		await common.sleep(2000);

		// GetCalendarResourceRequest
		const g2 = await soap.makeSOAPEnvelopeAdmin(
			`<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="foreignPrincipal">${fp2}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
		);

		// Verify response
		assert.equal(getResId(g2), resId);
	});
});
