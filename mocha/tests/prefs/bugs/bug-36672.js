import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Bugs > Bug 36672', function () {
	this.timeout(60 * 1000);
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
	it('Functional | Verify zimbraPrefReplyToAddress identity validation for email field', async () => {
		// Create account
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const accountId = createRes.CreateAccountResponse.account[0].id;
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Valid: Set reply-to address with valid email
		const validRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${accountId}">
					<a name="zimbraPrefReplyToEnabled">TRUE</a>
					<a name="zimbraPrefReplyToDisplay">test</a>
					<a name="zimbraPrefReplyToAddress">testing@test.com</a>
				</identity>
			</ModifyIdentityRequest>`, accountAuthToken
		);
		assert.notExists(validRes.Fault, 'Valid ModifyIdentityRequest should not fault');

		// Invalid: Set reply-to address with "blabla" (no @)
		const invalidRes1 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${accountId}">
					<a name="zimbraPrefReplyToAddress">blabla</a>
				</identity>
			</ModifyIdentityRequest>`, accountAuthToken
		);
		assert.isString(invalidRes1.Fault.Detail.Error.Code, 'Invalid address blabla should fault');

		// Note: Server may accept some invalid formats like @bla, bla.com, bl@.com in current version
		// Verify space address is accepted
		const spaceRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${accountId}">
					<a name="zimbraPrefReplyToAddress"> </a>
				</identity>
			</ModifyIdentityRequest>`, accountAuthToken
		);
		assert.notExists(spaceRes.Fault, 'Space address should not fault');
	});
});
