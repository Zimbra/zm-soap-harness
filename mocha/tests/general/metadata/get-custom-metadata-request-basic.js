import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Metadata > Get Custom Metadata Request Basic', function () {
	this.timeout(60 * 1000);
	let accountAuthToken, accountEmail;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

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
	it('Smoke | Verify basic GetCustomMetadataRequest works', async () => {
		const startTime = new Date();
		startTime.setDate(startTime.getDate() + 1);
		startTime.setHours(12, 0, 0, 0);
		const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
		const subject = `Subject of meeting${common.getUniqueString()}`;

		// Create an appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${common.toZimbraICalDate(startTime)}"/>
							<e d="${common.toZimbraICalDate(endTime)}"/>
							<or a="${accountEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const invId = createRes.CreateAppointmentResponse.invId;

		// Get custom metadata
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetCustomMetadataRequest id="${invId}" xmlns="urn:zimbraMail">
				<meta section="${invId}"/>
			</GetCustomMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify basic GetCustomMetadataRequest works for mail (no metadata)', async () => {
		// AddMsgRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msgId = addRes.AddMsgResponse.m[0].id || addRes.AddMsgResponse.m.id;
		const sectionKey = `zwc:${common.getUniqueString()}`;

		// Get custom metadata
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetCustomMetadataRequest id="${msgId}" xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetCustomMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify basic GetCustomMetadataRequest works for mail (with metadata)', async () => {
		// AddMsgRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msgId = addRes.AddMsgResponse.m[0].id || addRes.AddMsgResponse.m.id;

		const sectionKey = `zwc:${common.getUniqueString()}`;
		const metaKey = `key${common.getUniqueString()}`;
		const metaValue = `value${common.getUniqueString()}`;

		// Set custom metadata
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetCustomMetadataRequest id="${msgId}" xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${metaKey}">${metaValue}</a>
				</meta>
			</SetCustomMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'SetCustomMetadataRequest should not fault');

		// Get custom metadata
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetCustomMetadataRequest id="${msgId}" xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetCustomMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify basic GetCustomMetadataRequest works for mail (with multiple metadata)', async () => {
		// AddMsgRequest
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
				</m>
			</AddMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msgId = addRes.AddMsgResponse.m[0].id || addRes.AddMsgResponse.m.id;

		const sectionKey = `zwc:${common.getUniqueString()}`;
		const meta1Key = `key1${common.getUniqueString()}`;
		const meta1Value = `value1${common.getUniqueString()}`;
		const meta2Key = `key2${common.getUniqueString()}`;
		const meta2Value = `value2${common.getUniqueString()}`;

		// Set custom metadata
		const setRes = await soap.makeSOAPEnvelopeAccount(
			`<SetCustomMetadataRequest id="${msgId}" xmlns="urn:zimbraMail">
				<meta section="${sectionKey}">
					<a n="${meta1Key}">${meta1Value}</a>
					<a n="${meta2Key}">${meta2Value}</a>
				</meta>
			</SetCustomMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(setRes.Fault, 'SetCustomMetadataRequest should not fault');

		// Get custom metadata
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetCustomMetadataRequest id="${msgId}" xmlns="urn:zimbraMail">
				<meta section="${sectionKey}"/>
			</GetCustomMetadataRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
