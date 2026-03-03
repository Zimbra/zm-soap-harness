import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Forward Appointment Request Basic', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTimeFromEpoch(epochMs) {
        const d = new Date(epochMs);
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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    it('Smoke | Forward an appointment to another user', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const fwdEmail = `fwd${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, fwdEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const subject = `Subject${common.getUniqueString()}`;
        const epoch = 1514808000000;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        // Forward using ForwardAppointmentRequest
        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId.split('-')[0]}">
				<m>
					<e a="${fwdEmail}" t="t"/>
					<su>Fwd: ${subject}</su>
					<mp content-type="text/plain">
						<content>Forwarding this appointment</content>
					</mp>
				</m>
			</ForwardAppointmentRequest>`, orgToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Sanity | Forward appointment with custom body', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const fwdEmail = `fwd${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, fwdEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const subject = `Subject${common.getUniqueString()}`;
        const epoch = 1514808000000;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId.split('-')[0]}">
				<m>
					<e a="${fwdEmail}" t="t"/>
					<su>Custom: ${subject}</su>
					<mp content-type="text/plain">
						<content>Custom body for forward</content>
					</mp>
				</m>
			</ForwardAppointmentRequest>`, orgToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Sanity | Forward appointment to multiple recipients', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const fwd1Email = `fwd1${common.getUniqueString()}@${testDomain}`;
        const fwd2Email = `fwd2${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, fwd1Email, fwd2Email]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const subject = `MultiForward${common.getUniqueString()}`;
        const epoch = 1514808000000;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${icalTimeFromEpoch(epoch)}"/>
							<e d="${icalTimeFromEpoch(epoch + 3600000)}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        const invId = createRes.CreateAppointmentResponse.invId;

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId.split('-')[0]}">
				<m>
					<e a="${fwd1Email}" t="t"/>
					<e a="${fwd2Email}" t="t"/>
					<su>Fwd: ${subject}</su>
					<mp content-type="text/plain">
						<content>Forwarding to multiple</content>
					</mp>
				</m>
			</ForwardAppointmentRequest>`, orgToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });


    it('Regression | Forward appointment with invalid id', async () => {
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentRequest xmlns="urn:zimbraMail"
				id="999999">
				<m>
					<e a="${accountEmail}" t="t"/>
					<su>Fwd: invalid</su>
					<mp content-type="text/plain">
						<content>Invalid forward</content>
					</mp>
				</m>
			</ForwardAppointmentRequest>`, accountToken
        );
        assert.isString(fwdRes.Fault.Detail.Error.Code, 'Should fault with invalid id');
    });


    it('Regression | Forward recurring appointment instance', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const fwdEmail = `fwd${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, fwdEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const subject = `Subject${common.getUniqueString()}`;
        const epoch = 1514808000000;
        const tz = '(GMT-08.00) Pacific Time (US &amp; Canada) / Tijuana';
        const pstEpoch = epoch - 8 * 3600000;

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${subject}">
							<s d="${icalTimeFromEpoch(pstEpoch)}" tz="${tz}"/>
							<e d="${icalTimeFromEpoch(pstEpoch + 3600000)}"
								tz="${tz}"/>
							<or a="${orgEmail}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );
        assert.notExists(createRes.Fault, 'Create should not fault');
        const invId = createRes.CreateAppointmentResponse.invId;

        const fwdRes = await soap.makeSOAPEnvelopeAccount(
            `<ForwardAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId.split('-')[0]}">
				<m>
					<e a="${fwdEmail}" t="t"/>
					<su>Fwd: ${subject}</su>
					<mp content-type="text/plain">
						<content>Forwarding recurring</content>
					</mp>
				</m>
			</ForwardAppointmentRequest>`, orgToken
        );
        assert.notExists(fwdRes.Fault, 'Forward should not fault');
    });
});
