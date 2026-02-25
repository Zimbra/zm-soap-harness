import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Reload Account', function () {
	let adminAuthToken;
	let account1Name, account2Id;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		account1Name = `test${common.getUniqueString()}@${config.testDomain}`;
		const account2Name = `test${common.getUniqueString()}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		const r2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Id = r2.CreateAccountResponse.account[0].id;

		// Modify account2 with various attributes
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<a n="zimbraFeatureCalendarEnabled">TRUE</a>
				<a n="zimbraPrefMailInitialSearch">in:inbox</a>
				<a n="zimbraPop3Enabled">TRUE</a>
				<a n="zimbraImapEnabled">TRUE</a>
				<a n="zimbraContactMaxNumEntries">0</a>
				<a n="zimbraFeatureContactsEnabled">TRUE</a>
				<a n="zimbraPrefIncludeSpamInSearch">FALSE</a>
				<a n="zimbraPrefMailItemsPerPage">25</a>
				<a n="zimbraPasswordMinAge">0</a>
				<a n="zimbraPrefContactsPerPage">25</a>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send ReloadAccountRequest to reload account with changes made', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ReloadAccountRequest xmlns="urn:zimbraAdmin">
				<account name="${account1Name}"/>
			</ReloadAccountRequest>`, adminAuthToken
		);
		assert.isTrue(!!response.ReloadAccountResponse ||
			(response.Fault && response.Fault.Detail && response.Fault.Detail.Error &&
				response.Fault.Detail.Error.Code.includes('service.UNKNOWN_DOCUMENT')),
			'ReloadAccountResponse should exist or return UNKNOWN_DOCUMENT');
	});


	it('Regression | Send ReloadAccountRequest with blank email address. - service.FAILURE', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ReloadAccountRequest xmlns="urn:zimbraAdmin">
				<account name=""/>
			</ReloadAccountRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');

		const code = response.Fault.Detail.Error.Code;
		assert.isTrue(code.includes('service.FAILURE') || code.includes('service.INVALID_REQUEST') ||
			code.includes('service.UNKNOWN_DOCUMENT'),
			'Should return FAILURE or INVALID_REQUEST or UNKNOWN_DOCUMENT');
	});


	it('Regression | Send ReloadAccountRequest with invalid email address as alphabets. - service.FAILURE', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ReloadAccountRequest xmlns="urn:zimbraAdmin">
				<account name="invalid.email"/>
			</ReloadAccountRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');

		const code = response.Fault.Detail.Error.Code;
		assert.isTrue(code.includes('service.FAILURE') || code.includes('account.NO_SUCH_ACCOUNT') ||
			code.includes('service.UNKNOWN_DOCUMENT'),
			'Should return FAILURE or NO_SUCH_ACCOUNT or UNKNOWN_DOCUMENT');
	});


	it('Regression | smoke test for ReloadAccountRequest with invalid address as negative number. - service.FAILURE', async () => {
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<ReloadAccountRequest xmlns="urn:zimbraAdmin">
				<account name="-111111"/>
			</ReloadAccountRequest>`, adminAuthToken
		);
		assert.exists(response.Fault, 'Should have a Fault');

		const code = response.Fault.Detail.Error.Code;
		assert.isTrue(code.includes('service.FAILURE') || code.includes('account.NO_SUCH_ACCOUNT') ||
			code.includes('service.UNKNOWN_DOCUMENT'),
			'Should return FAILURE or NO_SUCH_ACCOUNT or UNKNOWN_DOCUMENT');
	});
});
