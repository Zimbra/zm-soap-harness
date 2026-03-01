import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > MetaData > Set Mailbox Metadata Request', function () {
	this.timeout(60 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
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
	it('Sanity | Verify basic SetMailboxMetadataRequest works', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const metaKey = `key${common.getUniqueString()}`;
		const metaValue = `value${common.getUniqueString()}`;

		// Set mailbox metadata
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${metaKey}">${metaValue}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');
		assert.exists(setRes.SetMailboxMetadataResponse,
			'SetMailboxMetadataResponse should exist');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});


	it('Sanity | Verify basic SetMailboxMetadataRequest works (with multiple metadata)', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const meta1Key = `key1${common.getUniqueString()}`;
		const meta1Value = `value1${common.getUniqueString()}`;
		const meta2Key = `key2${common.getUniqueString()}`;
		const meta2Value = `value2${common.getUniqueString()}`;

		// Set mailbox metadata
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'Response should not be a Fault');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});


	it('Sanity | Verify basic SetMailboxMetadataRequest works to clear multiple metadata', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const meta1Key = `key1${common.getUniqueString()}`;
		const meta1Value = `value1${common.getUniqueString()}`;
		const meta2Key = `key2${common.getUniqueString()}`;
		const meta2Value = `value2${common.getUniqueString()}`;

		// Set mailbox metadata
		await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// SetMailboxMetadataRequest
		const clearRes = await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(clearRes.Fault, 'Clear should not fault');
		assert.exists(clearRes.SetMailboxMetadataResponse,
			'SetMailboxMetadataResponse should exist');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});


	it('Sanity | SetMailboxMetadataRequest to set empty string to sub-sections (bug 46225)', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const meta1Key = `key1${common.getUniqueString()}`;
		const meta1Value = `value1${common.getUniqueString()}`;
		const meta2Key = `key2${common.getUniqueString()}`;

		// Set mailbox metadata
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}"></a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(setRes.Fault, 'Should return Fault for empty value');
		assert.include(setRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST',
			'Error code should be service.INVALID_REQUEST');
	});
});
