import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > DataSource > DataSource-FromAddress', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
    });

    it('Regression | DataSource FromAddress validation', async () => {
        const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
        const authToken = await soap.getAccountAuthToken(accountEmail);
        const dsName = `ds_${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(`<CreateDataSourceRequest xmlns="urn:zimbraMail"><pop3 name="${dsName}" isEnabled="0" host="pop.test.com" port="110" connectionType="cleartext" username="user_${common.getUniqueString()}" password="test123" leaveOnServer="1" l="2" fromAddress="from_${common.getUniqueString()}@${testDomain}"/></CreateDataSourceRequest>`, authToken);
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(res.CreateDataSourceResponse, 'Response should exist');
    });
});
