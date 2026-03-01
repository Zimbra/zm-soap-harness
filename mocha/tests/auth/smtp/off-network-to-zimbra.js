import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import server from '../../../framework/backend/server-command.js';
import { main } from '../../../pages/main.js';

describe('Auth > SMTP > Off Network To Zimbra', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name;
	let account2Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = 'smtp1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');

		account2Name = 'smtp2.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');

		// Get MTA server
		const serverRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetServerRequest xmlns="urn:zimbraAdmin">
				<server by="name">${config.serverHost}</server>
			</GetServerRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(serverRes.Fault, 'Response should not be a Fault');
		assert.exists(serverRes.GetServerResponse, 'GetServerResponse should exist');
		Array.isArray(serverRes.GetServerResponse.server)
			? serverRes.GetServerResponse.server[0]
			: serverRes.GetServerResponse.server;
	});

	after(async function () {
		const authToken = await soap.getAdminAuthToken();

		// Reset MTA config to defaults
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraMtaMyNetworks"></a>
				<a n="zimbraMtaTlsSecurityLevel">none</a>
				<a n="zimbraMtaSaslAuthEnable">no</a>
				<a n="zimbraMtaTlsAuthOnly">FALSE</a>
			</ModifyConfigRequest>`, authToken
		);
		await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmtactl reload\'');
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Serial tests
	if (config.serial === true && String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		it('Verify zimbraMtaTlsSecurityLevel may, zimbraMtaSaslAuthEnable TRUE, zimbraMtaTlsAuthOnly TRUE settings', async () => {
			this.timeout(120 * 1000);

			// ModifyConfigRequest
			const modifyRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
					<a n="zimbraMtaMyNetworks">127.0.0.0/8</a>
					<a n="zimbraMtaTlsSecurityLevel">may</a>
					<a n="zimbraMtaSaslAuthEnable">yes</a>
					<a n="zimbraMtaTlsAuthOnly">TRUE</a>
				</ModifyConfigRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
			assert.exists(modifyRes.ModifyConfigResponse, 'ModifyConfigResponse should exist');

			await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmtactl reload\'');
			await new Promise(resolve => setTimeout(resolve, 5000));

			// GetAllConfigRequest
			const configRes = await soap.makeSOAPEnvelopeAdmin(
				'<GetAllConfigRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
			);

			// Verify response
			assert.notExists(configRes.Fault, 'Response should not be a Fault');
			assert.exists(configRes.GetAllConfigResponse, 'GetAllConfigResponse should exist');
		});


		it('Verify zimbraMtaTlsSecurityLevel may, zimbraMtaSaslAuthEnable TRUE, zimbraMtaTlsAuthOnly FALSE settings', async () => {
			this.timeout(120 * 1000);

			// ModifyConfigRequest
			const modifyRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
					<a n="zimbraMtaMyNetworks">127.0.0.0/8</a>
					<a n="zimbraMtaTlsSecurityLevel">may</a>
					<a n="zimbraMtaSaslAuthEnable">yes</a>
					<a n="zimbraMtaTlsAuthOnly">FALSE</a>
				</ModifyConfigRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
			assert.exists(modifyRes.ModifyConfigResponse, 'ModifyConfigResponse should exist');

			await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmtactl reload\'');
			await new Promise(resolve => setTimeout(resolve, 5000));

			// GetAllConfigRequest
			const configRes = await soap.makeSOAPEnvelopeAdmin(
				'<GetAllConfigRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
			);

			// Verify response
			assert.notExists(configRes.Fault, 'Response should not be a Fault');
			assert.exists(configRes.GetAllConfigResponse, 'GetAllConfigResponse should exist');
		});


		it('Verify zimbraMtaTlsSecurityLevel may, zimbraMtaSaslAuthEnable FALSE, zimbraMtaTlsAuthOnly FALSE settings', async () => {
			this.timeout(120 * 1000);

			// ModifyConfigRequest
			const modifyRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
					<a n="zimbraMtaMyNetworks">127.0.0.0/8</a>
					<a n="zimbraMtaTlsSecurityLevel">may</a>
					<a n="zimbraMtaSaslAuthEnable">no</a>
					<a n="zimbraMtaTlsAuthOnly">FALSE</a>
				</ModifyConfigRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
			assert.exists(modifyRes.ModifyConfigResponse, 'ModifyConfigResponse should exist');

			await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmtactl reload\'');
			await new Promise(resolve => setTimeout(resolve, 5000));

			// GetAllConfigRequest
			const configRes = await soap.makeSOAPEnvelopeAdmin(
				'<GetAllConfigRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
			);

			// Verify response
			assert.notExists(configRes.Fault, 'Response should not be a Fault');
			assert.exists(configRes.GetAllConfigResponse, 'GetAllConfigResponse should exist');
		});


		it('Verify zimbraMtaTlsSecurityLevel none, zimbraMtaSaslAuthEnable FALSE, zimbraMtaTlsAuthOnly FALSE settings', async () => {
			this.timeout(120 * 1000);

			// ModifyConfigRequest
			const modifyRes = await soap.makeSOAPEnvelopeAdmin(
				`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
					<a n="zimbraMtaMyNetworks">127.0.0.0/8</a>
					<a n="zimbraMtaTlsSecurityLevel">none</a>
					<a n="zimbraMtaSaslAuthEnable">no</a>
					<a n="zimbraMtaTlsAuthOnly">FALSE</a>
				</ModifyConfigRequest>`, adminAuthToken
			);

			// Verify response
			assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
			assert.exists(modifyRes.ModifyConfigResponse, 'ModifyConfigResponse should exist');

			await server.runCommand('sudo su - zimbra -c \'/opt/zimbra/bin/zmmtactl reload\'');
			await new Promise(resolve => setTimeout(resolve, 5000));

			// GetAllConfigRequest
			const configRes = await soap.makeSOAPEnvelopeAdmin(
				'<GetAllConfigRequest xmlns="urn:zimbraAdmin"/>', adminAuthToken
			);

			// Verify response
			assert.notExists(configRes.Fault, 'Response should not be a Fault');
			assert.exists(configRes.GetAllConfigResponse, 'GetAllConfigResponse should exist');
		});
	}
});