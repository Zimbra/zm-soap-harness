import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Bug75785', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | GetShareInfoRequest gives serviceFAILURE mailbox not found for account', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get the folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
		assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');

		// Send get share info request
		const shareRes = await soap.makeSOAPEnvelopeAccount(
			`<GetShareInfoRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(shareRes.Fault, 'GetShareInfoRequest should not fault');
		assert.exists(shareRes.GetShareInfoResponse, 'GetShareInfoResponse should exist');
	});
});
