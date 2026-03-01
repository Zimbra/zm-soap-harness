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

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});


	// Applicable zimbra versions

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {

		return;

	}

	// Tests
	it('Sanity | Bug92160 Assertion error attempting to search', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${accountEmail}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		const subject = `subject_${common.getUniqueString()}`;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(`<SendMsgRequest xmlns="urn:zimbraMail"><m><e t="t" a="${accountEmail}"/><su>${subject}</su><mp ct="text/plain"><content>Test body</content></mp></m></SendMsgRequest>`, authToken);
		await new Promise(r => setTimeout(r, 2000));

		// Search item
		const searchRes = await soap.makeSOAPEnvelopeAccount(`<SearchRequest xmlns="urn:zimbraMail" types="message"><query>subject:(${subject})</query></SearchRequest>`, authToken);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
