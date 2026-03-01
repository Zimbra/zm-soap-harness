import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Bug47767', function () {
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
	it('Sanity | Verify signature names are not case sensitive', async () => {
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

		// Create a signature
		const createRes1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="aaa">
					<content type="text/plain">signature ${common.getUniqueString()}</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);

		// Verify the response
		assert.notExists(createRes1.Fault, 'CreateSignatureRequest aaa should not fault');
		assert.exists(createRes1.CreateSignatureResponse, 'CreateSignatureResponse should exist');

		// Create a signature
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="bbb">
					<content type="text/plain">signature ${common.getUniqueString()}</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);

		// Verify the response
		assert.notExists(createRes2.Fault, 'CreateSignatureRequest bbb should not fault');

		// Create a signature
		const createRes3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="Bbb">
					<content type="text/plain">signature ${common.getUniqueString()}</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);

		// Verify the response
		assert.exists(createRes3.Fault, 'CreateSignatureRequest Bbb should fault');
		assert.equal(createRes3.Fault.Detail.Error.Code, 'account.SIGNATURE_EXISTS',
			'Error code should be account.SIGNATURE_EXISTS');
	});


	it('Sanity | Verify signature type with invalid values', async () => {
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

		// Create a signature
		const res1 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="test${common.getUniqueString()}">
					<content type=" ">test content</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);

		// Verify the response
		assert.exists(res1.Fault, 'Blank signature type should fault');
		assert.equal(res1.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');

		// Create a signature
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="test${common.getUniqueString()}">
					<content type="abc">test content</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);

		// Verify the response
		assert.exists(res2.Fault, 'Invalid signature type should fault');
		assert.equal(res2.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');

		// Create a signature
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name=" ">
					<content type="abc">test content</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);

		// Verify the response
		assert.exists(res3.Fault, 'Blank signature name should fault');
		assert.equal(res3.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');
	});
});
