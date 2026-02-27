import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Sharing > Calendar > User Servlet Basic Auth', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);

		// Share calendar with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="10">
					<grant gt="usr" inh="1" perm="r" d="${account2Email}"/>
				</action>
			</FolderActionRequest>`, account1Token
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Access shared calendar via REST with basic auth', async () => {
		const res = await soap.makeRestRequest(account2Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VCALENDAR', 'Response should contain VCALENDAR');
	});


	it('Sanity | Access shared calendar via REST with auth token', async () => {
		const res = await soap.makeRestRequest(account2Token, {
			user: account1Email,
			folder: 'Calendar',
			fmt: 'ics',
			auth: 'co'
		});
		assert.equal(res.status, 200, 'REST GET should return 200');
		assert.include(res.body, 'VCALENDAR', 'Response should contain VCALENDAR');
	});
});
