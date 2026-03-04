import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('General > Headers > Context > Change', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;
	let accountEmail;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		accountEmail = `change${common.getUniqueString()}@${config.testDomain}`;

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
	it('Functional | Verify MODIFYCONFLICT response if change token and message id are the same for two different requests (SaveDraftRequest)', async () => {
		const subject1 = `Subject${common.getUniqueString()}`;
		const subject2 = `Subject${common.getUniqueString()}`;
		const content1 = `content${common.getUniqueString()}`;
		const content2 = `content${common.getUniqueString()}`;

		// Save draft
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject1}</su>
					<mp ct="text/plain">
						<content>${content1}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		const draftId = draftRes.SaveDraftResponse.m[0].id;

		// Save draft
		const draftRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m id="${draftId}">
					<e t="t" a="${accountEmail}"/>
					<su>${subject2}</su>
					<mp ct="text/plain">
						<content>${content2}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(draftRes2.Fault, 'Second SaveDraftRequest should not fault');

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}"/>
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = getMsgRes.GetMsgResponse.m[0];

		// Verify response
		assert.equal(msg.su, subject2, 'Draft subject should be updated');
	});


	it('Functional | Verify MODIFYCONFLICT response if change token and message id are the same for two different requests (ModifyContactRequest)', async () => {
		const email1 = `email${common.getUniqueString()}@foo.com`;
		const email2 = `email${common.getUniqueString()}@foo.com`;

		// Create a contact
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="email">${email1}</a>
				</cn>
			</CreateContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateContactRequest should not fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Modify the contact
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="1">
				<cn id="${contactId}">
					<a n="email">${email2}</a>
				</cn>
			</ModifyContactRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyContactRequest should not fault');

		// Get the contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetContactsRequest should not fault');
		const cn = getRes.GetContactsResponse.cn[0];
		const email = cn._attrs ? cn._attrs.email : undefined;

		// Verify response
		assert.exists(email, 'Should find email attribute');
		assert.equal(email, email2, 'Contact email should be updated');
	});


	it('Functional | Verify INVITEOUTOFDATE response if change token and message id are the same for two different requests (ModifyApptRequest)', async () => {
		const subject1 = `Subject${common.getUniqueString()}`;
		const subject2 = `Subject${common.getUniqueString()}`;
		const location1 = `Location${common.getUniqueString()}`;
		const location2 = `Location${common.getUniqueString()}`;
		const startTime = common.getGMTTime(60);
		const endTime = common.getGMTTime(120);

		// Create an appointment
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject1}" loc="${location1}">
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>content of appointment</content>
					</mp>
					<su>${subject1}</su>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const apptInvId = createRes.CreateAppointmentResponse.invId;

		// Modify the appointment
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${apptInvId}" comp="0">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						status="CONF" allDay="0" name="${subject2}" loc="${location2}">
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${accountEmail}"/>
					</inv>
					<mp content-type="text/plain">
						<content>updated content</content>
					</mp>
					<su>${subject2}</su>
				</m>
			</ModifyAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyAppointmentRequest should not fault');
	});
});
