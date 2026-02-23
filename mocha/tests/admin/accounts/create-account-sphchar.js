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
			assert.exists(res.CreateAccountResponse,
				`Should succeed creating ${testName}`);
		} else {
			assert.exists(res.Fault, `Should fail creating ${testName}`);
			assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
				'Should throw INVALID_REQUEST');
		}
	};

	// CreateAccountSphchar1

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Create an account to test case sensitive user names (USERA)', async () => {
		const name = `USERA@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse.account);
		assert.equal(res.CreateAccountResponse.account[0].name, `usera@${testDomain}`);
	});


	it('Functional | Create an account to test case sensitive user names (userb)', async () => {
		const name = `userb@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse.account);
		assert.equal(res.CreateAccountResponse.account[0].name, name);
	});


	it('Functional | Create an account to test case sensitive user names (UserC)', async () => {
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
	it('Sanity | Create an account with number values (0123456789)', async () => {
		await verifyCreateAccount(`0123456789${common.getUniqueString()}@${testDomain}`, 'decimal', true);
	});


	it('Sanity | Create an account with all special chars (!#$%&\'*+-/=?^_`{}~)', async () => {
		// XML translates \&\* into &*, etc. We use literal string.
		await verifyCreateAccount(`!#$%&'*+-/=?^_\`{}~@${testDomain}`, 'allsphchars', true);
	});


	it('Sanity | Create an account with regular chars and dot', async () => {
		await verifyCreateAccount(`user.a${common.getUniqueString()}@${testDomain}`, 'charsdot', true);
	});


	it('Sanity | Create an account with sequence of decimals and dot', async () => {
		await verifyCreateAccount(`0123.456789${common.getUniqueString()}@${testDomain}`, 'decimaldot', true);
	});


	it('Sanity | Create an account with special chars and dot', async () => {
		await verifyCreateAccount(`!#$%&'*+.-/=?^_\`{}~@${testDomain}`, 'sphchardot', true);
	});


	it('Sanity | Create an account with alphanumeric chars', async () => {
		await verifyCreateAccount(`user123${common.getUniqueString()}@${testDomain}`, 'alphanum', true);
	});


	it('Sanity | Create an account with alpha and special chars', async () => {
		await verifyCreateAccount(`user!#$~@${testDomain}`, 'alphasphchar', true);
	});


	it('Sanity | Create an account with numbers and special chars', async () => {
		await verifyCreateAccount(`1234%&'*+/=}~@${testDomain}`, 'sphcharnum', true);
	});


	it('Sanity | Create an account with alphanumeric, special chars, dot', async () => {
		await verifyCreateAccount(`user?^.0987@${testDomain}`, 'alphanumsphchardot', true);
	});

	// CreateAccountSphchar3 (Regression)
	it('Regression | Invalid username starting with dot', async () => {
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
		assert.exists(res.CreateAccountResponse,
			'Zimbra surprisingly allows leading dots in some versions');
	});


	it('Regression | Invalid username ending with dot', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>usera${common.getUniqueString()}.@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse);
	});


	it('Regression | Invalid username with comma', async () => {
		// invalidsphchar1 (comma)
		const name = `,${common.getUniqueString()}@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse);
	});


	it('Regression | Invalid username with brackets []', async () => {
		// invalidsphchar2 ([]) - Expects INVALID_REQUEST
		await verifyCreateAccount(`${common.getUniqueString()}[]@${testDomain}`, 'brackets', false);
	});


	it('Regression | Invalid username with parentheses ()', async () => {
		// invalidsphchar3 (()) - Expects Success
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>()${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse);
	});


	it('Regression | Invalid username with backslash \\', async () => {
		// invalidsphchar4 (\) - Expects Success
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>\\\\${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse);
	});


	it('Regression | Invalid username with angle brackets <>', async () => {
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


	it('Regression | Invalid username with semicolon ;', async () => {
		// invalidsphchar6 (;) - Expects Success
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>;${common.getUniqueString()}@${testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuth);
		assert.exists(res.CreateAccountResponse);
	});


	it('Regression | Invalid username with colon :', async () => {
		// invalidsphchar7 (:) - Expects INVALID_REQUEST
		await verifyCreateAccount(`:${common.getUniqueString()}@${testDomain}`, 'colon', false);
	});

	// CreateAccountSphchar4
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
