import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('New-Mail-Notification-Basic', function () {
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
	it('Smoke | Verify new mail notification sends automatic notification', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const senderEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		// Set notification preferences
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');

		// Verify preferences
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled"/>
				<pref name="zimbraPrefNewMailNotificationAddress"/>
			</GetPrefsRequest>`, baseAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');

		// Send message from sender
		const senderAuthToken = await soap.getAccountAuthToken(senderEmail);
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${baseEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>notification test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, senderAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
	});


	it('Functional | Verify notification for replied mail', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const senderEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		// Set notification
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send mail then reply
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${senderEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>initial message</content>
					</mp>
				</m>
			</SendMsgRequest>`, baseAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
	});


	it('Sanity | Verify notification when mail forwarded', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Verify notification for appointment invite', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Functional | Verify notification for mail with attachment', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Functional | Verify incoming notification triggers', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const senderEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${senderEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send message
		const senderAuthToken = await soap.getAccountAuthToken(senderEmail);
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${baseEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>incoming notification test</content>
					</mp>
				</m>
			</SendMsgRequest>`, senderAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
	});


	it('Functional | Verify notification disabled', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		// Enable then disable
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">notify@test.com</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">FALSE</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'Disable notification should not fault');

		// Verify disabled
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled"/>
			</GetPrefsRequest>`, baseAuthToken
		);
		assert.notExists(getRes.Fault, 'GetPrefsRequest should not fault');
		assert.exists(getRes.GetPrefsResponse, 'GetPrefsResponse should exist');
	});


	it('Sanity | Verify notification not sent from self', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		// Enable notification
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');

		// Send to self
		const subject = `subject.${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${baseEmail}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>self message</content>
					</mp>
				</m>
			</SendMsgRequest>`, baseAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
	});


	it('Functional | Verify notification for multipart mail', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Verify notification for mail to multiple addresses', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notifyEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notifyEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notifyEmail}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyPrefsRequest should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});


	it('Sanity | Verify notification address change', async () => {
		const baseEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const notify1Email = `test.${common.getUniqueString()}@${testDomain}`;
		const notify2Email = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${baseEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notify1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${notify2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const baseAuthToken = await soap.getAccountAuthToken(baseEmail);

		// Set first notification address
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationEnabled">TRUE</pref>
				<pref name="zimbraPrefNewMailNotificationAddress">${notify1Email}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);

		// Change to second notification address
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyPrefsRequest xmlns="urn:zimbraAccount">
				<pref name="zimbraPrefNewMailNotificationAddress">${notify2Email}</pref>
			</ModifyPrefsRequest>`, baseAuthToken
		);
		assert.notExists(modRes.Fault, 'Change notification address should not fault');
		assert.exists(modRes.ModifyPrefsResponse, 'ModifyPrefsResponse should exist');
	});
});
