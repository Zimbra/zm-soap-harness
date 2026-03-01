import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Bugs > Bug62552', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	// Test data variables (from XML properties)
	const searchfolder1 = { name: `searchfolder1_${common.getUniqueString()}`, subject: `searchfolder1_${common.getUniqueString()}`, from: accountEmail, content: `searchfolder1_${common.getUniqueString()}`, value: `searchfolder1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `searchfolder1_id`, toString() { return this.name; } };
	const searchfolder2 = { name: `searchfolder2_${common.getUniqueString()}`, subject: `searchfolder2_${common.getUniqueString()}`, from: accountEmail, content: `searchfolder2_${common.getUniqueString()}`, value: `searchfolder2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `searchfolder2_id`, toString() { return this.name; } };

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Imported search folder (Bug: 62552)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// GetFolder
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		searchfolder1_id = res2.GetFolderResponse.id;
		searchfolder2_id = res2.GetFolderResponse.id;
		assert.exists(res2.GetFolderResponse, 'Response element should exist');

		// FolderActionRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
 			<action  op="rename" id="${searchfolder1.id}" name="${searchfolder1.NewName}"/>
 			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.FolderActionResponse, 'Response element should exist');

		// FolderActionRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
 			<action  op="trash" id="${searchfolder2.id}" />
 			</FolderActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.FolderActionResponse, 'Response element should exist');

		// GetFolder
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)
		// XPath expression removed (not valid JS)
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.SearchResponse, 'SearchResponse should exist');
		assert.exists(res5.GetFolderResponse, 'Response element should exist');
	});
});
