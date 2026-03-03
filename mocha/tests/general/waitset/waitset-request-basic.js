import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('General > Waitset > Waitset Request Basic', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account2Email;
	let account2Id;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Email = `waitset${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `waitset${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'CreateAccountRequest should not fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		account1Id = acct1.id;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'CreateAccountRequest should not fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		account2Id = acct2.id;
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
	it('Smoke | Basic Test Case for WaitSetRequest (non blocking)', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
				<add>
					<a id="${account1Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const waitSetId = waitSetRes.CreateWaitSetResponse.waitSet;
		const waitSetSeq = waitSetRes.CreateWaitSetResponse.seq;

		// Send the message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Email}"/>
					<su>waitset test ${common.getUniqueString()}</su>
					<mp ct="text/plain">
						<content>test content</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Check for WaitSet updates
		const waitRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSetId}" seq="${waitSetSeq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitRes.Fault, 'WaitSetRequest should not fault');
	});


	it('Sanity | Basic Test Case for WaitSetRequest (blocking)', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account2Email);

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
				<add>
					<a id="${account2Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		assert.exists(waitSetRes.CreateWaitSetResponse.waitSet,
			'WaitSet id should exist');
		assert.exists(waitSetRes.CreateWaitSetResponse.seq,
			'WaitSet seq should exist');
	});


	it('Sanity | Basic Test Case to watch for appointments and contacts', async () => {
		const account3Email = `waitset${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);

		// GetInfoRequest
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount" sections="mbox"/>',
			account3AuthToken
		);
		const account3Id = infoRes.GetInfoResponse.id;

		// Create wait set
		const waitSetRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="c,a">
				<add>
					<a id="${account3Id}"/>
				</add>
			</CreateWaitSetRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(waitSetRes.Fault, 'CreateWaitSetRequest should not fault');
		const startTime = common.getGMTTime(-60);
		const endTime = common.getGMTTime(60);
		const subject = `Subject${common.getUniqueString()}`;

		// Create an appointment
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${account3Email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>test appointment</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account3AuthToken
		);

		// Create a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'CreateContactRequest should not fault');
	});


	it('Sanity | Verify Non-Admin accounts are restricted to a max of 5 WaitSet', async () => {
		const accountAuthToken = await soap.getAccountAuthToken(account1Email);
		let waitSet1Id, waitSet1Seq;
		for (let i = 0; i < 5; i++) {

			// Create wait set
			const res = await soap.makeSOAPEnvelopeAccount(
				`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
					<add>
						<a id="${account1Id}"/>
					</add>
				</CreateWaitSetRequest>`, accountAuthToken
			);

			// Verify response
			// Verify response
			assert.notExists(res.Fault, `CreateWaitSetRequest ${i + 1} should not fault`);
			if (i === 0) {
				waitSet1Id = res.CreateWaitSetResponse.waitSet;
				waitSet1Seq = res.CreateWaitSetResponse.seq;
			}
		}

		// Check for WaitSet updates
		const checkRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSet1Id}" seq="${waitSet1Seq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(checkRes.Fault, 'WaitSetRequest for WaitSet1 should still work');

		// Create wait set
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<CreateWaitSetRequest xmlns="urn:zimbraMail" defTypes="all">
				<add>
					<a id="${account1Id}"/>
				</add>
			</CreateWaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Creating 6th WaitSet should not fault');

		// Check for WaitSet updates
		const evictRes = await soap.makeSOAPEnvelopeAccount(
			`<WaitSetRequest xmlns="urn:zimbraMail"
				waitSet="${waitSet1Id}" seq="${waitSet1Seq}">
			</WaitSetRequest>`, accountAuthToken
		);

		// Verify response
		assert.isString(evictRes.Fault.Detail.Error.Code, 'WaitSet1 should be evicted after exceeding limit');
	});
});
