import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > DataSource > ImapImport > ImapImportBasic', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
    });

    it('Functional | Create IMAP data source', async () => {
        const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
        const authToken = await soap.getAccountAuthToken(accountEmail);
        const dsName = `imap_${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(`<CreateDataSourceRequest xmlns="urn:zimbraMail"><imap name="${dsName}" isEnabled="0" host="imap.test.com" port="143" connectionType="cleartext" username="user_${common.getUniqueString()}" password="test123" l="2"/></CreateDataSourceRequest>`, authToken);
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(res.CreateDataSourceResponse, 'Response should exist');
    });
});
