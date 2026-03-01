import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Calendar > ModifyMeetingRequest Aliases', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	// Test data variables (from XML properties)
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const account2 = { name: `account2_${common.getUniqueString()}`, subject: `account2_${common.getUniqueString()}`, from: accountEmail, content: `account2_${common.getUniqueString()}`, value: `account2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account2_id`, toString() { return this.name; } };
	const appointment = { name: `appointment_${common.getUniqueString()}`, subject: `appointment_${common.getUniqueString()}`, from: accountEmail, content: `appointment_${common.getUniqueString()}`, value: `appointment_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `appointment_id`, toString() { return this.name; } };
	const timezone = { name: `timezone_${common.getUniqueString()}`, subject: `timezone_${common.getUniqueString()}`, from: accountEmail, content: `timezone_${common.getUniqueString()}`, value: `timezone_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `timezone_id`, toString() { return this.name; } };
	const verb = { name: `verb_${common.getUniqueString()}`, subject: `verb_${common.getUniqueString()}`, from: accountEmail, content: `verb_${common.getUniqueString()}`, value: `verb_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `verb_id`, toString() { return this.name; } };

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify subject - (subject) search finds appointments that are modified (Bug: 40457)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateAppointmentRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
			<m >
			<inv>
			<comp status="CONF" fb="B" transp="O" allDay="0" name="${appointment.subject}">
			<or a="${account1.name}"/>
			<at a="${account2.name}" role="REQ" ptst="NE" rsvp="1"/>
			<s d="ICALTIME_PLACEHOLDER}" tz="${timezone.pst}" />
			<e  d="ICALTIME_PLUS1H_PLACEHOLDER}" tz="${timezone.pst}" />
			</comp>
			</inv>
			<e a="${account2.name}" t="t"/>
			<su>${appointment.subject}</su>
			<mp ct="text/plain">
			<content>${appointment.content}</content>
			</mp>
			</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const account1_appointment_invId = res2.CreateAppointmentResponse.invId;

		// GetMsgRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
                <m id="${account1.appointment.invId}"/>
            </GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const account1_appointment_compNum = res3.comp.compNum;
		account1_appointment_compNum = res3.GetMsgResponse.compNum;
		assert.exists(res3.GetMsgResponse, 'Response element should exist');

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// Unknown
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns = "urn:zimbraMail"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		// XPath expression removed (not valid JS)

		// SearchRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="TIME_MINUS1D_PLACEHOLDER}" calExpandInstEnd="TIME_PLUS1D_PLACEHOLDER}" types="appointment">
			<query>subject:(${appointment.subject}) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		const account2_appointment_invId = res6.appt[0].invId;
		account2_appointment_invId = res6.SearchResponse.invId;
		assert.exists(res6.SearchResponse, 'Response element should exist');

		// GetMsgRequest
		const res7 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
                <m id="${account2.appointment.invId}"/>
            </GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res7.Fault, 'Response should not be a Fault');
		const account2_appointment_compNum = res7.comp.compNum;
		account2_appointment_compNum = res7.GetMsgResponse.compNum;
		assert.exists(res7.GetMsgResponse, 'Response element should exist');

		// Mail
		const res8 = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail" verb="${verb.response}" id="${account2.appointment.invId}" compNum="${account2.appointment.compNum}" updateOrganizer="TRUE">
			<m rt="r">
			<e t="t" a="${account1.name}"/>
			<su>${verb.response}: ${appointment.subject}</su>
			<mp ct="text/plain">
			<content>${verb.response}: ${appointment.subject}</content>
			</mp>
			</m>
			</SendInviteReplyRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res8.Fault, 'Response should not be a Fault');
		assert.exists(res8.SendInviteReplyResponse, 'Response element should exist');

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res10 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="TIME_MINUS1D_PLACEHOLDER}" calExpandInstEnd="TIME_PLUS1D_PLACEHOLDER}" types="appointment">
			<query>subject:(${appointment.subject}) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res10.Fault, 'Response should not be a Fault');
		account1_appointment_invId = res10.appt[0].invId;
		account1_appointment_invId = res10.SearchResponse.invId;
		assert.exists(res10.SearchResponse, 'Response element should exist');

		// GetMsgRequest
		const res11 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
                <m id="${account1.appointment.invId}"/>
            </GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res11.Fault, 'Response should not be a Fault');
		account1_appointment_compNum = res11.comp.compNum;
		account1_appointment_compNum = res11.GetMsgResponse.compNum;
		assert.exists(res11.GetMsgResponse, 'Response element should exist');

		// ModifyAppointment
		const res12 = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${account1.appointment.invId}" comp="${account1.appointment.compNum}">
                <m>
                    <inv method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${appointment.subject}" >
			<or a="${account1.name}"/>
			<at a="${account2.alias}" role="REQ" ptst="NE" rsvp="1"/>
			<s d="ICALTIME_PLACEHOLDER}" tz="${timezone.pst}" />
			<e  d="ICALTIME_PLUS1H_PLACEHOLDER}" tz="${timezone.pst}" />
                    </inv>
                    <mp content-type="text/plain">
                        <content>${appointment.content}</content>
                    </mp>
			<e a="${account2.alias}" t="t"/>
                    <su>${appointment.subject}</su>
                </m>
            </ModifyAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res12.Fault, 'Response should not be a Fault');
		account1_appointment_invId = res12.ModifyAppointmentResponse.invId;

		// GetMsgRequest
		const res13 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
                <m id="${account1.appointment.invId}"/>
            </GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res13.Fault, 'Response should not be a Fault');
		assert.exists(res13.GetMsgResponse, 'Response element should exist');

		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res15 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="TIME_MINUS1D_PLACEHOLDER}" calExpandInstEnd="TIME_PLUS1D_PLACEHOLDER}" types="appointment">
			<query>inid:10</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res15.Fault, 'Response should not be a Fault');
		account2_appointment_invId = res15.appt[0].invId;
		account2_appointment_invId = res15.SearchResponse.invId;
		assert.exists(res15.SearchResponse, 'Response element should exist');

		// SearchRequest
		const res16 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="TIME_MINUS1D_PLACEHOLDER}" calExpandInstEnd="TIME_PLUS1D_PLACEHOLDER}" types="appointment">
			<query>subject:(${appointment.subject}) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res16.Fault, 'Response should not be a Fault');
		account2_appointment_invId = res16.appt[0].invId;
		account2_appointment_invId = res16.SearchResponse.invId;
		assert.exists(res16.SearchResponse, 'Response element should exist');

		// GetMsgRequest
		const res17 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
                <m id="${account2.appointment.invId}"/>
            </GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res17.Fault, 'Response should not be a Fault');
		assert.exists(res17.GetMsgResponse, 'Response element should exist');
	});
});
