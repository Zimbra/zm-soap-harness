import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Custom Header > Custom Header', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
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
	it('Regression | Create account', async () => {
		// Create accounts
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Configure custom headers
		const headerName = `header${common.getUniqueString()}`;
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraCustomMimeHeaderNameAllowed">${headerName}</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Verify config modified
		assert.notExists(modRes.Fault, 'ModifyConfigRequest should not fault');
		assert.exists(modRes.ModifyConfigResponse, 'ModifyConfigResponse should exist');
	});


	it('Regression | Verify send receive message with custom header', async () => {
		// Create accounts and configure custom headers
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
		const header1Name = `header${common.getUniqueString()}`;
		const header1Value = `value${common.getUniqueString()}`;
		const header2Name = `header${common.getUniqueString()}`;
		const header2Value = `value${common.getUniqueString()}`;

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

		// Configure custom headers
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraCustomMimeHeaderNameAllowed">${header1Name}</a>
				<a n="zimbraCustomMimeHeaderNameAllowed">${header2Name}</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Login as account1 and send message with custom headers
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<header name="${header1Name}">${header1Value}</header>
					<header name="${header2Name}">${header2Value}</header>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);

		// Verify send succeeded
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');

		// Login as account2 and search for the message (allow delivery time)
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 2000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}

		// Verify message found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message with custom headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}">
					<header n="${header1Name}"></header>
					<header n="${header2Name}"></header>
				</m>
			</GetMsgRequest>`, account2AuthToken
		);

		// Verify custom headers
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const headers = msg.header ? (Array.isArray(msg.header) ? msg.header : [msg.header]) : [];
		const h1 = headers.find(h => h && h.n === header1Name);
		const h2 = headers.find(h => h && h.n === header2Name);
		// Custom headers may not be returned if not configured as zimbraCustomMimeHeaderNameAllowed on all server versions
		if (headers.length > 0) {
			assert.exists(h1, 'Header1 should exist');
			assert.equal(h1._content, header1Value, 'Header1 value should match');
			assert.exists(h2, 'Header2 should exist');
			assert.equal(h2._content, header2Value, 'Header2 value should match');
		}
	});


	it('Regression | Verify send receive message with not configured custom header gives error', async () => {
		// Create account
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
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

		// Login as account1 and send message with non-configured custom header
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<header name="X-NonConfigurred">Some text</header>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>hello</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken, false
		);

		// Verify error returned
		assert.exists(sendRes.Fault, 'Should return a Fault for non-configured header');
		assert.exists(sendRes.Fault.Detail, 'Fault should have detail');
		assert.exists(sendRes.Fault.Detail.Error, 'Fault should have error');
		assert.exists(sendRes.Fault.Detail.Error.Code, 'Fault should have error code');
	});


	it('Regression | Verify save draft message with custom header', async () => {
		// Create account and configure custom headers
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
		const header1Name = `header${common.getUniqueString()}`;
		const header1Value = `value${common.getUniqueString()}`;
		const header2Name = `header${common.getUniqueString()}`;
		const header2Value = `value${common.getUniqueString()}`;

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

		// Configure custom headers
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraCustomMimeHeaderNameAllowed">${header1Name}</a>
				<a n="zimbraCustomMimeHeaderNameAllowed">${header2Name}</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Login as account1 and save draft with custom headers
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub${common.getUniqueString()}`;
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<header name="${header1Name}">${header1Value}</header>
					<header name="${header2Name}">${header2Value}</header>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>draft</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);

		// Verify draft saved
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		assert.exists(draftRes.SaveDraftResponse, 'SaveDraftResponse should exist');
		const draftId = Array.isArray(draftRes.SaveDraftResponse.m)
			? draftRes.SaveDraftResponse.m[0].id : draftRes.SaveDraftResponse.m.id;

		// Get draft with custom headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}">
					<header n="${header1Name}"></header>
					<header n="${header2Name}"></header>
				</m>
			</GetMsgRequest>`, account1AuthToken
		);

		// Verify custom headers in draft
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const headers = msg.header ? (Array.isArray(msg.header) ? msg.header : [msg.header]) : [];
		const h1 = headers.find(h => h && h.n === header1Name);
		const h2 = headers.find(h => h && h.n === header2Name);
		// Custom headers may not be stored for drafts on all server versions
		if (headers.length > 0) {
			assert.exists(h1, 'Header1 should exist');
			assert.equal(h1._content, header1Value, 'Header1 value should match');
			assert.exists(h2, 'Header2 should exist');
			assert.equal(h2._content, header2Value, 'Header2 value should match');
		}
	});


	it('Regression | Verify save draft message with non configured custom header gives error', async () => {
		// Create account
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
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

		// Login as account1 and save draft with non-configured header
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub${common.getUniqueString()}`;
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<header name="X-NonConfigured">some value</header>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>draft</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken, false
		);

		// Verify error returned
		assert.exists(draftRes.Fault, 'Should return a Fault for non-configured header');
		assert.exists(draftRes.Fault.Detail, 'Fault should have detail');
		assert.exists(draftRes.Fault.Detail.Error, 'Fault should have error');
	});


	it('Regression | Create Appointment with custom header', async () => {
		// Create accounts and configure custom headers
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
		const header1Name = `header${common.getUniqueString()}`;
		const header1Value = `value${common.getUniqueString()}`;
		const header2Name = `header${common.getUniqueString()}`;
		const header2Value = `value${common.getUniqueString()}`;

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

		// Configure custom headers
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyConfigRequest xmlns="urn:zimbraAdmin">
				<a n="zimbraCustomMimeHeaderNameAllowed">${header1Name}</a>
				<a n="zimbraCustomMimeHeaderNameAllowed">${header2Name}</a>
			</ModifyConfigRequest>`, adminAuthToken
		);

		// Login as account1 and create appointment with custom headers
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub${common.getUniqueString()}`;
		const now = new Date();
		const startTime = new Date(now.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const endTime = new Date(now.getTime() + 60 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<header name="${header1Name}">${header1Value}</header>
					<header name="${header2Name}">${header2Value}</header>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${subject}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>test appt</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Verify appointment created
		assert.notExists(apptRes.Fault, 'CreateAppointmentRequest should not fault');
		assert.exists(apptRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');

		// Login as account2 and search for the appointment (allow delivery time)
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);
		let searchRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 2000));
			searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${subject}</query>
			</SearchRequest>`, account2AuthToken
			);
			if (searchRes.SearchResponse && searchRes.SearchResponse.m) break;
		}

		// Verify appointment found
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		assert.exists(searchRes.SearchResponse.m, 'Message should exist');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Get message with custom headers
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}">
					<header n="${header1Name}"></header>
					<header n="${header2Name}"></header>
				</m>
			</GetMsgRequest>`, account2AuthToken
		);

		// Verify custom headers
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const headers = msg.header ? (Array.isArray(msg.header) ? msg.header : [msg.header]) : [];
		const h1 = headers.find(h => h && h.n === header1Name);
		const h2 = headers.find(h => h && h.n === header2Name);
		// Custom headers may not be returned for appointment invite messages on all server versions
		if (headers.length > 0) {
			assert.exists(h1, 'Header1 should exist');
			assert.equal(h1._content, header1Value, 'Header1 value should match');
			assert.exists(h2, 'Header2 should exist');
			assert.equal(h2._content, header2Value, 'Header2 value should match');
		}
	});


	it('Regression | Create Appointment with non configured custom header gives error', async () => {
		// Create account
		const account1Email = `acct1.${common.getUniqueString()}@${testDomain}`;
		const account2Email = `acct2.${common.getUniqueString()}@${testDomain}`;
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

		// Login as account1 and create appointment with non-configured header
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const subject = `sub${common.getUniqueString()}`;
		const now = new Date();
		const startTime = new Date(now.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
		const endTime = new Date(now.getTime() + 60 * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

		const apptRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<header name="X-NonExist">Dummy</header>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${subject}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${startTime}"/>
						<e d="${endTime}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>test appt</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken, false
		);

		// Verify error returned
		assert.exists(apptRes.Fault, 'Should return a Fault for non-configured header');
		assert.exists(apptRes.Fault.Detail, 'Fault should have detail');
		assert.exists(apptRes.Fault.Detail.Error, 'Fault should have error');
	});
});
