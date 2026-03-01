import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Bugs > Bug92160', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
    });

    it('Sanity | Bug92160 Assertion error attempting to search', async () => {
        const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
        const authToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `subject_${common.getUniqueString()}`;
        await soap.makeSOAPEnvelopeAccount(`<SendMsgRequest xmlns="urn:zimbraMail"><m><e t="t" a="${accountEmail}"/><su>${subject}</su><mp ct="text/plain"><content>Test body</content></mp></m></SendMsgRequest>`, authToken);
        await new Promise(r => setTimeout(r, 2000));
        const searchRes = await soap.makeSOAPEnvelopeAccount(`<SearchRequest xmlns="urn:zimbraMail" types="message"><query>subject:(${subject})</query></SearchRequest>`, authToken);
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
    });
});
