import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Metadata > Modify Mailbox Metadata Request Basic', function () {
	this.timeout(60 * 1000);
	let accountAuthToken;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
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
	it('Sanity | Verify basic ModifyMailboxMetadataRequest works', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const metaKey = `key${common.getUniqueString()}`;
		const metaValue = `value${common.getUniqueString()}`;
		const modifiedKey = `modkey${common.getUniqueString()}`;
		const modifiedValue = `modvalue${common.getUniqueString()}`;

		// Set mailbox metadata
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${metaKey}">${metaValue}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'SetMailboxMetadataRequest should not fault');

		// Modify mailbox metadata
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${modifiedKey}">${modifiedValue}</a>
				</meta>
			</ModifyMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});


	it('Sanity | Verify basic ModifyMailboxMetadataRequest works Modify all', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const metaKey = `key${common.getUniqueString()}`;
		const metaValue = `value${common.getUniqueString()}`;
		const modifiedSectionKey = `zwc:${common.getUniqueString()}`;
		const modifiedKey = `modkey${common.getUniqueString()}`;
		const modifiedValue = `modvalue${common.getUniqueString()}`;

		// Set mailbox metadata
		await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${metaKey}">${metaValue}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Modify mailbox metadata
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${modifiedSectionKey}">
					<a n="${modifiedKey}">${modifiedValue}</a>
				</meta>
			</ModifyMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyMailboxMetadataRequest should not fault');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${modifiedSectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});


	it('Sanity | Verify basic ModifyMailboxMetadataRequest works (with multiple metadata)', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const meta1Key = `key1${common.getUniqueString()}`;
		const meta1Value = `value1${common.getUniqueString()}`;
		const meta2Key = `key2${common.getUniqueString()}`;
		const meta2Value = `value2${common.getUniqueString()}`;
		const meta1ModifiedKey = `modkey${common.getUniqueString()}`;
		const meta1ModifiedValue = `modvalue${common.getUniqueString()}`;

		// Set mailbox metadata
		await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Modify mailbox metadata
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
					<a n="${meta1ModifiedKey}">${meta1ModifiedValue}</a>
				</meta>
			</ModifyMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyMailboxMetadataRequest should not fault');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});


	it('Sanity | ModifyMailboxMetadataRequest to set empty string to sub-sections (bug 46225)', async () => {
		const sectionKey = `zwc:${common.getUniqueString()}`;
		const meta1Key = `key1${common.getUniqueString()}`;
		const meta1Value = `value1${common.getUniqueString()}`;
		const meta2Key = `key2${common.getUniqueString()}`;
		const meta2Value = `value2${common.getUniqueString()}`;
		const meta1ModifiedKey = `modkey${common.getUniqueString()}`;

		// Set mailbox metadata
		await soap.makeSOAPEnvelopeAccount(
			`<SetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
				</meta>
			</SetMailboxMetadataRequest>`, accountAuthToken
		);

		// Modify mailbox metadata
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
					<a n="${meta1ModifiedKey}"></a>
				</meta>
			</ModifyMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault,
			'ModifyMailboxMetadataRequest should not fault');

		// Get mailbox metadata
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMailboxMetadataRequest xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetMailboxMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetMailboxMetadataRequest should not fault');
	});
});
