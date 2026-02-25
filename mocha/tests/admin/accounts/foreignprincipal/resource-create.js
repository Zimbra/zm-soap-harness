import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Foreignprincipal > Resource Create', function () {
	let adminAuthToken;
	let cosId;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin"><name xmlns="">cos${common.getUniqueString()}</name></CreateCosRequest>`, adminAuthToken
		);
		cosId = cosRes.CreateCosResponse.cos[0].id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create an account with a foreign principal attribute', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const resName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<a n="zimbraForeignPrincipal">${fp}</a>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(response.CreateCalendarResourceResponse);
	});


	it('Sanity | Create an account with two foreign principal attributes', async () => {
		const fp1 = `test:${common.getUniqueString()}`;
		const fp2 = `test:${common.getUniqueString()}`;
		const resName = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<a n="zimbraForeignPrincipal">${fp1}</a>
				<a n="zimbraForeignPrincipal">${fp2}</a>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${resName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(response.CreateCalendarResourceResponse);
	});


	it('Sanity | Create two accounts with the same foreign principal attributes', async () => {
		const fp = `test:${common.getUniqueString()}`;
		const res1Name = `fp.${common.getUniqueString()}@${config.testDomain}`;
		const res2Name = `fp.${common.getUniqueString()}@${config.testDomain}`;

		const r1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${res1Name}</name>
				<a n="zimbraForeignPrincipal">${fp}</a>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${res1Name}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(r1.CreateCalendarResourceResponse);

		const r2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${res2Name}</name>
				<a n="zimbraForeignPrincipal">${fp}</a>
				<a n="zimbraCOSId">${cosId}</a>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${res2Name}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
		);
		assert.exists(r2.CreateCalendarResourceResponse);
	});
});
