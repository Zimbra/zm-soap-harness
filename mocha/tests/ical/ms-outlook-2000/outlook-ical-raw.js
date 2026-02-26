import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > MS Outlook 2000 > Raw', function () {
    this.timeout(30 * 1000);

    before(async function () {
        await main.before(this.ctx);
    });

    // Applicable zimbra versions
    if (config.serial === true ||
        !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it.skip('Functional | Verify the basic iCal format when lmtp inject is used to inject the iCal' +
        ' [LMTP inject not supported in JS framework]', async () => {
            // Requires t:lmtpInjectRequest to inject Outlook 2000 raw MIME
        });
});
