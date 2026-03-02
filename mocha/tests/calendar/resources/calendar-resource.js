import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Resources > Calendar Resource', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
    });

    beforeEach(async function () {
        await main.beforeEach(this);
    });

    afterEach(async function () {
        await main.afterEach(this);
    });

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }


    it('Smoke | CreateCalendarResourceRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.CreateCalendarResourceResponse.calresource,
            'Resource should be created'
        );
    });


    it('Smoke | DeleteCalendarResourceRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        const resId = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0].id
            : createRes.CreateCalendarResourceResponse.calresource.id;

        const delRes = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
			</DeleteCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(delRes.Fault, 'Should not fault');
        assert.exists(
            delRes.DeleteCalendarResourceResponse,
            'Response should exist'
        );
    });


    it('Smoke | ModifyCalendarResourceRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        const resId = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0].id
            : createRes.CreateCalendarResourceResponse.calresource.id;

        const modRes = await soap.makeSOAPEnvelopeAdmin(
            `<ModifyCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<a n="zimbraCalResType">Location</a>
			</ModifyCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(modRes.Fault, 'Should not fault');
        assert.exists(
            modRes.ModifyCalendarResourceResponse.calresource,
            'Modified resource should exist'
        );
    });


    it('Smoke | RenameCalendarResourceRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        const newName = `resnew${common.getUniqueString()}@${testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        const resId = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0].id
            : createRes.CreateCalendarResourceResponse.calresource.id;

        const renRes = await soap.makeSOAPEnvelopeAdmin(
            `<RenameCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
				<newName>${newName}</newName>
			</RenameCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(renRes.Fault, 'Should not fault');
        assert.exists(
            renRes.RenameCalendarResourceResponse.calresource,
            'Renamed resource should exist'
        );
    });


    it('Smoke | GetCalendarResourceRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        const createRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        const resId = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0].id
            : createRes.CreateCalendarResourceResponse.calresource.id;

        const getRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<calresource by="id">${resId}</calresource>
			</GetCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(getRes.Fault, 'Should not fault');
        assert.exists(
            getRes.GetCalendarResourceResponse.calresource,
            'Resource should be returned'
        );
    });


    it('Smoke | GetAllCalendarResourcesRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );

        const getRes = await soap.makeSOAPEnvelopeAdmin(
            `<GetAllCalendarResourcesRequest xmlns="urn:zimbraAdmin">
				<domain by="name">${testDomain}</domain>
			</GetAllCalendarResourcesRequest>`, adminAuthToken
        );
        assert.notExists(getRes.Fault, 'Should not fault');
        assert.exists(
            getRes.GetAllCalendarResourcesResponse.calresource,
            'Resources should be returned'
        );
    });


    it('Smoke | SearchCalendarResourcesRequest', async () => {
        const resName = `res${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );

        const searchRes = await soap.makeSOAPEnvelopeAdmin(
            `<SearchCalendarResourcesRequest xmlns="urn:zimbraAdmin"
				attrs="displayName">
				<searchFilter>
					<conds>
						<cond attr="displayName" op="has"
							value="${resName}"/>
					</conds>
				</searchFilter>
			</SearchCalendarResourcesRequest>`, adminAuthToken
        );
        assert.notExists(searchRes.Fault, 'Should not fault');
        assert.exists(
            searchRes.SearchCalendarResourcesResponse.calresource,
            'Resource should be found'
        );
    });
});
