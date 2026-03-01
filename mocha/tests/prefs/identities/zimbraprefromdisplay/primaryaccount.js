import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Identities > ZimbraPrefFromDisplay > PrimaryAccount', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
    });

    async function ca() {
        const e = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${e}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
        return await soap.getAccountAuthToken(e);
    }

    it('Functional | Modify zimbraPrefFromDisplay for default identity', async () => {
        const authToken = await ca();
        const displayName = `Display_${common.getUniqueString()}`;
        const getRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);
        assert.notExists(getRes.Fault, 'GetIdentities should not fault');
        const defaultIdentity = getRes.GetIdentitiesResponse?.identity?.[0] || getRes.GetIdentitiesResponse?.identity;
        const identityId = defaultIdentity?.id;
        assert.exists(identityId, 'Default identity should have an id');
        const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"><a name="zimbraPrefFromDisplay">${displayName}</a></identity></ModifyIdentityRequest>`, authToken);
        assert.notExists(modRes.Fault, 'ModifyIdentity should not fault');
    });

    it('Functional | Verify zimbraPrefFromDisplay after modify', async () => {
        const authToken = await ca();
        const displayName = `Verify_${common.getUniqueString()}`;
        const getRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);
        const identityId = getRes.GetIdentitiesResponse?.identity?.[0]?.id || getRes.GetIdentitiesResponse?.identity?.id;
        await soap.makeSOAPEnvelopeAccount(`<ModifyIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"><a name="zimbraPrefFromDisplay">${displayName}</a></identity></ModifyIdentityRequest>`, authToken);
        const verifyRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);
        assert.notExists(verifyRes.Fault, 'Verify should not fault');
        assert.exists(verifyRes.GetIdentitiesResponse, 'Response should exist');
    });

    it('Functional | Reset zimbraPrefFromDisplay to empty', async () => {
        const authToken = await ca();
        const getRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);
        const identityId = getRes.GetIdentitiesResponse?.identity?.[0]?.id || getRes.GetIdentitiesResponse?.identity?.id;
        const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"><a name="zimbraPrefFromDisplay"></a></identity></ModifyIdentityRequest>`, authToken);
        assert.notExists(modRes.Fault, 'Reset should not fault');
    });
});
