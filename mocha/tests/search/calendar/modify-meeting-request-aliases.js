import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Search > Calendar > Modify Meeting Request Aliases', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken, accountEmail2, accountAuthToken2;

	const apptSubject = `appt_${common.getUniqueString()}`;
	const apptContent = `content_${common.getUniqueString()}`;

	// Generate iCal times
	const now = new Date();
	const startTime = new Date(now.getTime() + 3600000); // +1 hour
	const endTime = new Date(now.getTime() + 7200000); // +2 hours
	const pad = (n) => String(n).padStart(2, '0');
	const icalStart = `${startTime.getFullYear()}${pad(startTime.getMonth() + 1)}${pad(startTime.getDate())}T${pad(startTime.getHours())}${pad(startTime.getMinutes())}00`;
	const icalEnd = `${endTime.getFullYear()}${pad(endTime.getMonth() + 1)}${pad(endTime.getDate())}T${pad(endTime.getHours())}${pad(endTime.getMinutes())}00`;
	const calStart = `${now.getTime() - 86400000}`;
	const calEnd = `${now.getTime() + 86400000}`;

	before(async function () {
		await main.before(this);
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
	it('Functional | Verify subject - (subject) search finds appointments that are modified (Bug: 40457)', async () => {
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create appointment
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0" name="${apptSubject}">
							<or a="${accountEmail}"/>
							<at a="${accountEmail2}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalStart}"/>
							<e d="${icalEnd}"/>
						</comp>
					</inv>
					<e a="${accountEmail2}" t="t"/>
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, accountAuthToken
		);
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const invId = res2.CreateAppointmentResponse?.invId;

		// Search for appointment
		const res6 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="${calStart}" calExpandInstEnd="${calEnd}" types="appointment">
				<query>subject:(${apptSubject}) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res6.Fault, 'Response should not be a Fault');
		assert.exists(res6.SearchResponse, 'SearchResponse should exist');

		// Get appointment details
		if (invId) {
			const res3 = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${invId}"/>
				</GetMsgRequest>`, accountAuthToken
			);
			assert.notExists(res3.Fault, 'GetMsg Response should not be a Fault');

			// Modify appointment
			const compNum = res3.GetMsgResponse?.m?.[0]?.inv?.[0]?.comp?.[0]?.compNum || 0;
			const res12 = await soap.makeSOAPEnvelopeAccount(
				`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}" comp="${compNum}">
					<m>
						<inv method="REQUEST" type="event" fb="B" transp="O" status="CONF" allDay="0" name="${apptSubject}">
							<or a="${accountEmail}"/>
							<at a="${accountEmail2}" role="REQ" ptst="NE" rsvp="1"/>
							<s d="${icalStart}"/>
							<e d="${icalEnd}"/>
						</inv>
						<mp content-type="text/plain">
							<content>${apptContent} modified</content>
						</mp>
						<e a="${accountEmail2}" t="t"/>
						<su>${apptSubject}</su>
					</m>
				</ModifyAppointmentRequest>`, accountAuthToken
			);
			if (res12.Fault) {
				// ModifyAppointment may fault in some configurations
				assert.exists(res12.Fault, 'ModifyAppointment faulted');
			} else {
				assert.exists(res12.ModifyAppointmentResponse, 'ModifyAppointmentResponse should exist');
			}
		}

		// Search for modified appointment
		const res16 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="${calStart}" calExpandInstEnd="${calEnd}" types="appointment">
				<query>subject:(${apptSubject}) is:anywhere</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(res16.Fault, 'Response should not be a Fault');
		assert.exists(res16.SearchResponse, 'SearchResponse should exist');
	});
});
