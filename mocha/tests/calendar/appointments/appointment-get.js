import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Appointment-Get', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTime(offsetMs) {
        const d = new Date(Date.now() + offsetMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

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
    it('Smoke | Obtain the details of an appointment using GetAppointmentRequest', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
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
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const location = 'Meeting Room 1';

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="${location}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // GetAppointmentRequest
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${invId}"/>`,
            account1Token
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getRes.GetAppointmentResponse.appt[0]
            || getRes.GetAppointmentResponse.appt;
        assert.equal(appt.inv[0].comp[0].name, subject, 'Subject should match');
        assert.equal(appt.inv[0].comp[0].loc, location, 'Location should match');
    });


    it('Regression | GetAppointmentRequest with invalid values of id', async () => {
        // Create account
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // Test with blank id
        const res1 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id=""/>',
            accountToken
        );
        assert.exists(res1.Fault, 'Blank id should fault');

        // Test with space id
        const res2 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id="            "/>',
            accountToken
        );
        assert.exists(res2.Fault, 'Space id should fault');

        // Test with sometext id
        const res3 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id="some text"/>',
            accountToken
        );
        assert.exists(res3.Fault, 'Sometext id should fault');

        // Test with negative id
        const res4 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id="-1"/>',
            accountToken
        );
        assert.exists(res4.Fault, 'Negative id should fault');

        // Test with zero id
        const res5 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id="0"/>',
            accountToken
        );
        assert.exists(res5.Fault, 'Zero id should fault');

        // Test with large number id
        const res6 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id="1234567890"/>',
            accountToken
        );
        assert.exists(res6.Fault, 'Large number id should fault');

        // Test with decimal id
        const res7 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail" id="12.34"/>',
            accountToken
        );
        assert.exists(res7.Fault, 'Decimal id should fault');

        // Test without id attribute
        const res8 = await soap.makeSOAPEnvelopeAccount(
            '<GetAppointmentRequest xmlns="urn:zimbraMail"/>',
            accountToken
        );
        assert.exists(res8.Fault, 'Missing id should fault');
    });


    it('Regression | GetAppointmentRequest with id of a canceled appointment', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
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
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Cancel appointment
        const cancelRes = await soap.makeSOAPEnvelopeAccount(
            `<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<e a="${account2Email}" t="t"/>
					<su>${subject}</su>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, account1Token
        );
        assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');

        // GetAppointmentRequest on cancelled appointment
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${invId}"/>`,
            account1Token
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getRes.GetAppointmentResponse.appt[0]
            || getRes.GetAppointmentResponse.appt;
        assert.equal(appt.l, '3', 'Cancelled appointment should be in Trash (folder 3)');
    });


    it('Sanity | Obtain the details of an appointment using GetAppointmentRequest with UID', async () => {
        // Create accounts
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        const account2Email = `test${common.getUniqueString()}@${testDomain}`;
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
        const account1Token = await soap.getAccountAuthToken(account1Email);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const location = 'Meeting Room 1';

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="${location}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(3600000)}"/>
						<or a="${account1Email}"/>
					</inv>
					<e a="${account2Email}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Get UID from the appointment
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
        const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
            ? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
        const uid = msg.inv[0].comp[0].uid;

        // GetAppointmentRequest with UID
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail" uid="${uid}"/>`,
            account1Token
        );
        assert.notExists(getRes.Fault, 'GetAppointmentRequest should not fault');
        const appt = getRes.GetAppointmentResponse.appt[0]
            || getRes.GetAppointmentResponse.appt;
        assert.equal(appt.inv[0].comp[0].name, subject, 'Subject should match');
        assert.equal(appt.inv[0].comp[0].loc, location, 'Location should match');
    });
});
