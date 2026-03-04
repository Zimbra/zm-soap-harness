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
        const calRes = Array.isArray(res.CreateCalendarResourceResponse.calresource)
            ? res.CreateCalendarResourceResponse.calresource[0]
            : res.CreateCalendarResourceResponse.calresource;
        assert.exists(calRes, 'Resource should be created');
        const host = calRes.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host, 'zimbraMailHost should exist');
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
        const calRes2 = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0]
            : createRes.CreateCalendarResourceResponse.calresource;
        const resId = calRes2.id;
        const host2 = calRes2.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host2, 'zimbraMailHost should exist');

        const delRes = await soap.makeSOAPEnvelopeAdmin(
            `<DeleteCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<id>${resId}</id>
			</DeleteCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(delRes.Fault, 'Should not fault');
        assert.notExists(
            delRes.Fault,
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
        const calRes3 = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0]
            : createRes.CreateCalendarResourceResponse.calresource;
        const resId = calRes3.id;
        const host3 = calRes3.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host3, 'zimbraMailHost should exist');

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
        const calRes4 = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0]
            : createRes.CreateCalendarResourceResponse.calresource;
        const resId = calRes4.id;
        const host4 = calRes4.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host4, 'zimbraMailHost should exist');

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
        const calRes5 = Array.isArray(createRes.CreateCalendarResourceResponse.calresource)
            ? createRes.CreateCalendarResourceResponse.calresource[0]
            : createRes.CreateCalendarResourceResponse.calresource;
        const resId = calRes5.id;
        const host5 = calRes5.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host5, 'zimbraMailHost should exist');

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
        const createRes6 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(createRes6.Fault, 'CreateCalendarResourceRequest should not fault');
        const calRes6 = Array.isArray(createRes6.CreateCalendarResourceResponse.calresource)
            ? createRes6.CreateCalendarResourceResponse.calresource[0]
            : createRes6.CreateCalendarResourceResponse.calresource;
        const host6 = calRes6.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host6, 'zimbraMailHost should exist');

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
        const createRes7 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="displayName">${resName}</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(createRes7.Fault, 'CreateCalendarResourceRequest should not fault');
        const calRes7 = Array.isArray(createRes7.CreateCalendarResourceResponse.calresource)
            ? createRes7.CreateCalendarResourceResponse.calresource[0]
            : createRes7.CreateCalendarResourceResponse.calresource;
        const host7 = calRes7.a.find(a => a.n === 'zimbraMailHost');
        assert.exists(host7, 'zimbraMailHost should exist');

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
