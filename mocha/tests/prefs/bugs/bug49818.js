import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Bugs > Bug49818', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
    });

    it('Sanity | Bug49818 Unidentified characters in notification message', async () => {
        const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
        const authToken = await soap.getAccountAuthToken(accountEmail);
        const notifAddr = `notif.${common.getUniqueString()}@${testDomain}`;
        const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyPrefsRequest xmlns="urn:zimbraAccount"><pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref><pref name="zimbraPrefNewMailNotificationAddress">${notifAddr}</pref></ModifyPrefsRequest>`, authToken);
        assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
    });
});
