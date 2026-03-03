import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Out Of Office > Outofoffice', function () {
	this.timeout(120 * 1000);
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
	it('Functional | OutOfOffice01 - Set OOO pref and send message', async () => {
		const account1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Enable OOO
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">I am out of office</pref>
			</ModifyPrefsRequest>`, account1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send message
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
	});


	it('Functional | OutOfOffice02 - OOO with date range', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Enable OOO with date range
		const fromDate = '20260101000000Z';
		const untilDate = '20261231235959Z';
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">I am out of office until Dec 2026</pref>
				<pref name="zimbraPrefOutOfOfficeFromDate">${fromDate}</pref>
				<pref name="zimbraPrefOutOfOfficeUntilDate">${untilDate}</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest with date range should not fault');
	});


	it('Functional | OutOfOffice03 - Get OOO prefs to verify', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Enable OOO
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">OOO verify content</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);

		// Get prefs and verify
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled"/>
				<pref name="zimbraPrefOutOfOfficeReply"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
	});


	it('Functional | OutOfOffice04 - Disable OOO and verify', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Enable then disable OOO
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">temp reply</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'Disable OOO should not fault');

		// Verify disabled
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled"/>
			</GetPrefsRequest>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
	});


	it('Functional | OutOfOffice05 - OOO with external reply', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Enable OOO with external reply
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefOutOfOfficeReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeReply">Internal OOO reply</pref>
				<pref name="zimbraPrefOutOfOfficeExternalReplyEnabled">TRUE</pref>
				<pref name="zimbraPrefOutOfOfficeExternalReply">External OOO reply</pref>
			</ModifyPrefsRequest>`, accountAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest external reply should not fault');
	});
});
