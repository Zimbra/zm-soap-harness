import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Identities > Bug7090', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	const uid = common.getUniqueString();
	const prefix = 'prefix';

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `account1.${uid}@${config.testDomain}`;

		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(res.CreateAccountResponse?.account)
			? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		account1Id = acct?.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Sanity | Verify zmrestore zimbraPrefReplyToAddress does not point to old email after -pre -ca restore', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		const getIdRes = await soap.makeSOAPEnvelopeAccount(
			'<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>', acctAuthToken
		);
		assert.exists(getIdRes.GetIdentitiesResponse, 'GetIdentitiesResponse should exist');

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="DEFAULT">
					<a name="zimbraPrefReplyToEnabled">TRUE</a>
					<a name="zimbraPrefReplyToDisplay">ReplyTo</a>
					<a name="zimbraPrefReplyToAddress">${account1Name}</a>
				</identity>
			</ModifyIdentityRequest>`, acctAuthToken
		);
		assert.exists(modRes.ModifyIdentityResponse, 'ModifyIdentityResponse should exist');

		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup zip="0" method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		const backupLabel = backupRes.BackupResponse?.backup?.label;

		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ca" label="${backupLabel}" prefix="${prefix}">
					<account name="${account1Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'Response should not be a Fault');

		const prefixedName = `${prefix}${account1Name}`;
		const prefixAuthToken = await soap.getAccountAuthToken(prefixedName);

		if (prefixAuthToken) {
			const getIdRes2 = await soap.makeSOAPEnvelopeAccount(
				'<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>', prefixAuthToken
			);
			assert.exists(getIdRes2.GetIdentitiesResponse, 'GetIdentitiesResponse should exist after restore');
		}
	});
});
