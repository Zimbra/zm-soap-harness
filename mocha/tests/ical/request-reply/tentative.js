import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > Request Reply > Tentative', function () {
	this.timeout(30 * 1000);

	before(async function () {
		await main.before(this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tentative-103
	it.skip('Functional | Verify REPLY message' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Tentative-103
	});


	// Tentative-107
	it.skip('Functional | Verify that TRANSP - OPAQUE is the default' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Tentative-107
	});


	// Tentative-110
	it.skip('Functional | Verify that TRANSP - OPAQUE is preserved in REPLY' +
        ' [LMTP inject not supported in JS framework]', async () => {
		// Tentative-110
	});
});
