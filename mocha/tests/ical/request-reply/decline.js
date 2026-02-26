import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > Request Reply > Decline', function () {
    this.timeout(30 * 1000);

    before(async function () {
        await main.before(this.ctx);
    });

    // Applicable zimbra versions
    if (config.serial === true ||
        !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Decline-102
    it.skip('Functional | Verify REPLY message' +
        ' [LMTP inject not supported in JS framework]', async () => {
            // Decline-102
        });


    // Decline-107
    it.skip('Functional | Verify that TRANSP - OPAQUE is the default' +
        ' [LMTP inject not supported in JS framework]', async () => {
            // Decline-107
        });


    // Decline-110
    it.skip('Functional | Verify that TRANSP - OPAQUE is preserved in REPLY' +
        ' [LMTP inject not supported in JS framework]', async () => {
            // Decline-110
        });
});
