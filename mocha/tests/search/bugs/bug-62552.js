import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Bugs > Bug 62552', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	before(async function () {
		await main.before(this);
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
	it('Sanity | Imported search folder (Bug: 62552)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create two search folders
		const sfName1 = `searchfolder1_${common.getUniqueString()}`;
		const sfName2 = `searchfolder2_${common.getUniqueString()}`;

		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${sfName1}" query="subject:test" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const sf1Id = res1.CreateSearchFolderResponse?.search?.[0]?.id || res1.CreateSearchFolderResponse?.search?.id;

		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${sfName2}" query="subject:hello" l="1"/>
			</CreateSearchFolderRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const sf2Id = res2.CreateSearchFolderResponse?.search?.[0]?.id || res2.CreateSearchFolderResponse?.search?.id;

		// Rename search folder 1
		const newName = `${sfName1}_renamed`;
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="rename" id="${sf1Id}" name="${newName}"/>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res3.Fault, 'Response should not be a Fault');

		// Trash search folder 2
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="trash" id="${sf2Id}"/>
			</FolderActionRequest>`, accountAuthToken
		);
		assert.notExists(res4.Fault, 'Response should not be a Fault');

		// Verify folders
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		assert.notExists(res5.Fault, 'Response should not be a Fault');
	});
});
