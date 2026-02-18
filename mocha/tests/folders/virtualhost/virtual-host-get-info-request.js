import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > VirtualHost > GetInfoRequest', function () {
    let virtHostAccount;
    let virtAuth;
    let virtDomain;

    before(async function () {
        const adminAuth = await soap.getAdminAuthToken();

        const unique = common.getUniqueString();
        const domainName = `domain.${unique}.${config.testDomain}`;
        const virtHostname = `virtual.${domainName}`;

        await soap.makeSOAPEnvelopeAdmin(
            `<CreateDomainRequest xmlns="urn:zimbraAdmin">
                <name>${domainName}</name>
                <a n="zimbraVirtualHostname">${virtHostname}</a>
                <a n="zimbraPublicServiceHostname">${virtHostname}</a>
            </CreateDomainRequest>`, adminAuth);

        virtHostAccount = `vh_user_info_${unique}@${domainName}`;
        await soap.createAccountByNameAndEmailAddress(adminAuth, virtHostAccount, virtHostAccount);

        // Login with Virtual Host
        const authResp = await soap.makeSOAPEnvelopeAccount(
            `<AuthRequest xmlns="urn:zimbraAccount">
                <account by="name">${virtHostAccount}</account>
                <password>${config.accountPassword}</password>
                <virtualHost>${virtHostname}</virtualHost>
            </AuthRequest>`,
            null
        );
        virtAuth = authResp.AuthResponse.authToken[0]._content;

        virtDomain = virtHostname;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (virtHostAccount) await soap.deleteAccount(virtHostAccount, adminAuth);
        // Best effort domain cleanup - can be tricky if we lost the ID or original name
    });


    it('Sanity | Get Info Request in Virtual Host Domain', async () => {
        const resp = await soap.makeSOAPEnvelopeAccount(
            `<GetInfoRequest xmlns="urn:zimbraAccount"/>`,
            virtAuth
        );
        assert.exists(resp.GetInfoResponse, 'Should return info');
        assert.include(resp.GetInfoResponse.rest, virtDomain, 'REST URL should contain virtual hostname');
        assert.include(resp.GetInfoResponse.soapURL, virtDomain, 'SOAP URL should contain virtual hostname');
    });
});
