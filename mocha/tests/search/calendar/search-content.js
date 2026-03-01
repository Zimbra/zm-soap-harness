import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Search > Calendar > Content', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;
	let res;

	// Test data variables (from XML properties)
	const Time1 = { name: `Time1_${common.getUniqueString()}`, subject: `Time1_${common.getUniqueString()}`, from: accountEmail, content: `Time1_${common.getUniqueString()}`, value: `Time1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `Time1_id`, toString() { return this.name; } };
	const Time2 = { name: `Time2_${common.getUniqueString()}`, subject: `Time2_${common.getUniqueString()}`, from: accountEmail, content: `Time2_${common.getUniqueString()}`, value: `Time2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `Time2_id`, toString() { return this.name; } };
	const account1 = { name: `account1_${common.getUniqueString()}`, subject: `account1_${common.getUniqueString()}`, from: accountEmail, content: `account1_${common.getUniqueString()}`, value: `account1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account1_id`, toString() { return this.name; } };
	const account2 = { name: `account2_${common.getUniqueString()}`, subject: `account2_${common.getUniqueString()}`, from: accountEmail, content: `account2_${common.getUniqueString()}`, value: `account2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `account2_id`, toString() { return this.name; } };
	const appt = { name: `appt_${common.getUniqueString()}`, subject: `appt_${common.getUniqueString()}`, from: accountEmail, content: `appt_${common.getUniqueString()}`, value: `appt_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `appt_id`, toString() { return this.name; } };
	const appt1 = { name: `appt1_${common.getUniqueString()}`, subject: `appt1_${common.getUniqueString()}`, from: accountEmail, content: `appt1_${common.getUniqueString()}`, value: `appt1_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `appt1_id`, toString() { return this.name; } };
	const appt2 = { name: `appt2_${common.getUniqueString()}`, subject: `appt2_${common.getUniqueString()}`, from: accountEmail, content: `appt2_${common.getUniqueString()}`, value: `appt2_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `appt2_id`, toString() { return this.name; } };
	const appt3 = { name: `appt3_${common.getUniqueString()}`, subject: `appt3_${common.getUniqueString()}`, from: accountEmail, content: `appt3_${common.getUniqueString()}`, value: `appt3_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `appt3_id`, toString() { return this.name; } };
	const appt4 = { name: `appt4_${common.getUniqueString()}`, subject: `appt4_${common.getUniqueString()}`, from: accountEmail, content: `appt4_${common.getUniqueString()}`, value: `appt4_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `appt4_id`, toString() { return this.name; } };
	const defaultlocale = { name: `defaultlocale_${common.getUniqueString()}`, subject: `defaultlocale_${common.getUniqueString()}`, from: accountEmail, content: `defaultlocale_${common.getUniqueString()}`, value: `defaultlocale_${common.getUniqueString()}`, address: accountEmail, domainname: config.testDomain, id: `defaultlocale_id`, toString() { return this.name; } };

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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Login as the appropriate test account', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// CreateAppointmentRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
                <m>
                    <inv method="REQUEST" type="event" allday="0" name="${appt.subject}" loc="${appt.location}">
                        <at ptst="TE" role="OPT" status="NE" rsvp="1" a="${account2.user}"/>
                        <s d="${Time1}" tz="${account1.timezone}"/>
                        <e d="${Time2}" tz="${account1.timezone}"/>
                        <or a="${account1.user}"/>
                    </inv>
                    <e a="${account2.user}" t="t"/>
                    <mp content-type="text/plain">
                        <content>${appt.content}</content>
                    </mp>
                    <su>${appt.subject}</su>
                </m>
            </CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const appt_id = res2.CreateAppointmentResponse.invId;

		// CreateAppointmentRequest
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
                <m>
                    <inv method="REQUEST" type="event" allday="0" name="${appt1.subject}" loc="${appt1.location}">
                        <at ptst="TE" role="OPT" status="NE" rsvp="1" a="${account2.user}"/>
                        <s d="${Time1}" tz="${account1.timezone}"/>
                        <e d="${Time2}" tz="${account1.timezone}"/>
                        <or a="${account1.user}"/>
                    </inv>
                    <e a="${account2.user}" t="t"/>
                    <mp content-type="text/plain">
                        <content>${appt1.content}</content>
                    </mp>
                    <su>${appt1.subject}</su>
                </m>
            </CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		const appt1_id = res3.CreateAppointmentResponse.invId;

		// CreateAppointmentRequest
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
                <m>
                    <inv method="REQUEST" type="event" allday="0" name="${appt2.subject}" loc="${appt2.location}">
                        <at ptst="TE" role="OPT" status="NE" rsvp="1" a="${account2.user}"/>
                        <s d="${Time1}" tz="${account1.timezone}"/>
                        <e d="${Time2}" tz="${account1.timezone}"/>
                        <or a="${account1.user}"/>
                    </inv>
                    <e a="${account2.user}" t="t"/>
                    <mp content-type="text/plain">
                        <content>${appt2.content}</content>
                    </mp>
                    <su>${appt2.subject}</su>
                </m>
            </CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		const appt2_id = res4.CreateAppointmentResponse.invId;

		// CreateAppointmentRequest
		const res5 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
                <m>
                    <inv method="REQUEST" type="event" allday="0" name="${appt3.subject}" loc="${appt3.location}">
                        <at ptst="TE" role="OPT" status="NE" rsvp="1" a="${account2.user}"/>
                        <s d="${Time1}" tz="${account1.timezone}"/>
                        <e d="${Time2}" tz="${account1.timezone}"/>
                        <or a="${account1.user}"/>
                    </inv>
                    <e a="${account2.user}" t="t"/>
                    <mp content-type="text/plain">
                        <content>${appt3.content}</content>
                    </mp>
                    <su>${appt3.subject}</su>
                </m>
            </CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res5.Fault, 'Response should not be a Fault');
		const appt3_id = res5.CreateAppointmentResponse.invId;

		// CreateAppointmentRequest
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
                <m>
                    <inv method="REQUEST" type="event" allday="0" name="${appt4.subject}" loc="${appt4.location}">
                        <at ptst="TE" role="OPT" status="NE" rsvp="1" a="${account2.user}"/>
                        <s d="${appt4.time1}"/>
                        <e d="${appt4.time2}"/>
                        <or a="${account1.user}"/>
                    </inv>
                    <e a="${account2.user}" t="t"/>
                    <mp content-type="text/plain">
                        <content>${appt4.content}</content>
                    </mp>
                    <su>${appt4.subject}</su>
                </m>
            </CreateAppointmentRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		const appt4_id = res6.CreateAppointmentResponse.invId;
	});


	it('Functional | Search for an appointment based on subject (Bug: 3141, 5176)', async () => {
		// Account auth
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
			<tz id="${defaultlocale.timezone}"/>
			<query>subject:"${appt1.subject}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search for an appointment based on location (Bug: 3141, 5176)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
			<tz id="${defaultlocale.timezone}"/>
			<query>"${appt2.location}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search for an appointment based on content (Bug: 3141, 5176)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
			<tz id="${defaultlocale.timezone}"/>
			<query>"${appt3.content}"</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});


	it('Functional | Search for an appointment based on date (Bug: 2753, 5176)', async () => {
		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
			<tz id="${defaultlocale.timezone}"/>
			<query>before:${appt4.date}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');
	});
});
