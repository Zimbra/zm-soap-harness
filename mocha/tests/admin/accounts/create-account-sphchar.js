import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Create Account Sphchar', function () {
	let adminAuth;
	let testDomain;

	before(async function () {
		await main.before(this);
		adminAuth = await soap.getAdminAuthToken();
		testDomain = `domain${common.getUniqueString()}.com`;

		// adminSetup_AcctCreateSpChar: Create Domain
		const createDomainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${testDomain}</name>
			</CreateDomainRequest>`, adminAuth);
		assert.notExists(createDomainRes.Fault, 'Response should not be a Fault');
		assert.exists(createDomainRes.CreateDomainResponse,
			'Test domain should be created');
	});

	const verifyCreateAccount = async (accountName, testName, isPassing) => {
		const encodedAccountName = accountName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${encodedAccountName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);

		if (isPassing) {
			assert.notExists(res.Fault, 'Response should not be a Fault');
			assert.exists(res.CreateAccountResponse,
				`Should succeed creating ${testName}`);
		} else {
			assert.exists(res.Fault, `Should fail creating ${testName}`);
			assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should throw INVALID_REQUEST');
		}
	};

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Create an account to test case sensitive user names', async () => {
		const name = `USERA@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse.account);
		assert.equal(res.CreateAccountResponse.account[0].name, `usera@${testDomain}`);
	});


	it('Functional | Create an account to test case sensitive user names 1', async () => {
		const name = `userb@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse.account);
		assert.equal(res.CreateAccountResponse.account[0].name, name);
	});


	it('Functional | Create an account to test case sensitive user names 2', async () => {
		const name = `UserC@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse.account);
		assert.equal(res.CreateAccountResponse.account[0].name, `userc@${testDomain}`);
	});

	// CreateAccountSphchar2
	it('Sanity | Create an account with valid values1', async () => {
		await verifyCreateAccount(`0123456789${common.getUniqueString()}@${testDomain}`, 'decimal', true);
	});


	it('Sanity | Create an account with valid values2', async () => {
		// XML translates \&\* into &*, etc. We use literal string.
		await verifyCreateAccount(`!#$%&'*+-/=?^_\`{}~@${testDomain}`, 'allsphchars', true);
	});


	it('Sanity | Create and modify an account with zimbraCalendarReminderDeviceEmail', async () => {
		await verifyCreateAccount(`user.a${common.getUniqueString()}@${testDomain}`, 'charsdot', true);
	});


	it('Sanity | Create an account with valid values of zimbraContactMaxNumEntries', async () => {
		await verifyCreateAccount(`0123.456789${common.getUniqueString()}@${testDomain}`, 'decimaldot', true);
	});


	it('Sanity | Create and modify an account with zimbraCalendarReminderDeviceEmail 1', async () => {
		await verifyCreateAccount(`!#$%&'*+.-/=?^_\`{}~@${testDomain}`, 'sphchardot', true);
	});


	it('Sanity | Create an account with valid values', async () => {
		await verifyCreateAccount(`user123${common.getUniqueString()}@${testDomain}`, 'alphanum', true);
	});


	it('Sanity | Create and modify an account with zimbraCalendarReminderDeviceEmail 2', async () => {
		await verifyCreateAccount(`user!#$~@${testDomain}`, 'alphasphchar', true);
	});


	it('Sanity | Create and modify an account with zimbraCalendarReminderDeviceEmail 3', async () => {
		await verifyCreateAccount(`1234%&'*+/=}~@${testDomain}`, 'sphcharnum', true);
	});


	it('Sanity | Create an account with valid values 1', async () => {
		await verifyCreateAccount(`user?^.0987@${testDomain}`, 'alphanumsphchardot', true);
	});

	// CreateAccountSphchar3 (Regression)
	it('Regression | GetConfigRequest with n invalid value', async () => {
		// Zimbra accepts certain names that RFCs don't or tests expect failure but might succeed.
		// If the XML expected a failure (like service.INVALID_REQUEST) vs success.
		// Wait, looking at dotstart XML: <t:select path="//admin:CreateAccountResponse/admin:account"
		// It says "not supported according to RFC2822" but expects CreateAccountResponse!
		// The XML tests 1,2,3,4,6,8 expect Success. Tests 5, 7, 9 expect INVALID_REQUEST.
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>.usera${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const account = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		assert.exists(account, 'CreateAccountResponse should contain account');
	});


	it('Regression | Set newpassword with invalid id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>usera${common.getUniqueString()}.@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const account = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		assert.exists(account, 'CreateAccountResponse should contain account');
	});


	it('Regression | SearchMultiMailboxRequest with invalid query1', async () => {
		// invalidsphchar1 (comma)
		const name = `,${common.getUniqueString()}@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const account = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		assert.exists(account, 'CreateAccountResponse should contain account');
	});


	it('Regression | SearchMultiMailboxRequest with invalid query2', async () => {
		// invalidsphchar2 ([]) - Expects INVALID_REQUEST
		await verifyCreateAccount(`${common.getUniqueString()}[]@${testDomain}`, 'brackets', false);
	});


	it('Regression | SearchMultiMailboxRequest with invalid query3', async () => {
		// invalidsphchar3 (()) - Expects Success
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>()${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const account = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		assert.exists(account, 'CreateAccountResponse should contain account');
	});


	it('Regression | SearchMultiMailboxRequest with invalid query4', async () => {
		// invalidsphchar4 (\) - Expects Success
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>\\\\${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const account = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		assert.exists(account, 'CreateAccountResponse should contain account');
	});


	it('Regression | login with a domain with less than invalid query5', async () => {
		// invalidsphchar5 (<>) - Expects INVALID_REQUEST
		// Note: XML payload might need escaping.
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>&lt;&gt;${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.Fault);
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | SearchMultiMailboxRequest with invalid query6', async () => {
		// invalidsphchar6 (;) - Expects Success
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>;${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		const account = Array.isArray(res.CreateAccountResponse?.account) ?
			res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		assert.exists(account, 'CreateAccountResponse should contain account');
	});


	it('Regression | SearchMultiMailboxRequest with invalid query7', async () => {
		// invalidsphchar7 (:) - Expects INVALID_REQUEST
		await verifyCreateAccount(`:${common.getUniqueString()}@${testDomain}`, 'colon', false);
	});


	it('Sanity | Create an alias of distribution list with special characters', async () => {
		const listName = `distlist${common.getUniqueString()}@${testDomain}`;
		const createListRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${listName}</name>
				<a n="description">A test distribution list</a>
			</CreateDistributionListRequest>`, adminAuth);
		assert.exists(createListRes.CreateDistributionListResponse.dl);

		const listId = createListRes.CreateDistributionListResponse.dl[0].id;
		const aliasName = `''&lt;//\\\\@${testDomain}`;
		const aliasRes = await soap.makeSOAPEnvelopeAdmin(
			`<AddDistributionListAliasRequest xmlns="urn:zimbraAdmin">
				<id>${listId}</id>
				<alias>${aliasName}</alias>
			</AddDistributionListAliasRequest>`, adminAuth);

		// Should encounter INVALID_REQUEST
		assert.exists(aliasRes.Fault);
		assert.include(aliasRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});
});
