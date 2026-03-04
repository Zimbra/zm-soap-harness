import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Timezones > Appointment Tz Send Reply', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	const pad = (n) => String(n).padStart(2, '0');

	function futureTime(offsetMs) {
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

	async function makeAcct(prefix) {
		const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
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
		const token = await soap.getAccountAuthToken(email);
		return { email, token };
	}

	async function createMeetingTz(orgToken, orgEmail, invEmail, subj, tz) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subj}" fb="B" transp="O"
							status="CONF">
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}" tz="${tz}"/>
							<e d="${t2}" tz="${tz}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subj}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		return res;
	}

	// Appointment-Tz-SendReply (76 tests)
	const tzReplies = [
		'America/New_York', 'America/Chicago',
		'America/Denver', 'America/Los_Angeles',
		'America/Anchorage', 'Pacific/Honolulu',
		'America/Phoenix', 'US/Eastern',
		'US/Central', 'US/Mountain',
		'US/Pacific', 'US/Alaska',
		'Europe/London', 'Europe/Paris',
		'Europe/Berlin', 'Europe/Rome',
		'Europe/Madrid', 'Europe/Amsterdam',
		'Europe/Stockholm', 'Europe/Oslo',
		'Europe/Helsinki', 'Europe/Warsaw',
		'Europe/Prague', 'Europe/Budapest',
		'Europe/Athens', 'Europe/Istanbul',
		'Europe/Moscow', 'Europe/Lisbon',
		'Asia/Tokyo', 'Asia/Shanghai',
		'Asia/Hong_Kong', 'Asia/Singapore',
		'Asia/Kolkata', 'Asia/Seoul',
		'Asia/Bangkok', 'Asia/Dubai',
		'Asia/Riyadh', 'Asia/Tehran',
		'Australia/Sydney', 'Australia/Melbourne',
		'Australia/Brisbane', 'Australia/Perth',
		'Australia/Adelaide', 'Australia/Hobart',
		'Australia/Darwin', 'Australia/Canberra',
		'Pacific/Auckland', 'Pacific/Fiji',
		'Pacific/Guam', 'Pacific/Tongatapu',
		'Africa/Cairo', 'Africa/Johannesburg',
		'Africa/Lagos', 'Africa/Nairobi',
		'Africa/Casablanca', 'Africa/Addis_Ababa',
		'Africa/Accra', 'Africa/Dar_es_Salaam',
		'America/Sao_Paulo', 'America/Buenos_Aires',
		'America/Santiago', 'America/Lima',
		'America/Bogota', 'America/Caracas',
		'America/Mexico_City', 'America/Toronto',
		'America/Vancouver', 'America/Edmonton',
		'America/Winnipeg', 'America/Halifax',
		'America/St_Johns', 'America/Regina',
		'America/Whitehorse', 'America/Yellowknife',
		'America/Iqaluit', 'America/Rankin_Inlet'
	];

	tzReplies.forEach((tz, i) => {
		const type = i === 0 ? 'Smoke' : 'Sanity';
		it(`${type} | TZ meeting reply - ${tz}`, async () => {
			const org = await makeAcct('org');
			const inv = await makeAcct('inv');
			const s = `Subj${common.getUniqueString()}`;
			const res = await createMeetingTz(
				org.token, org.email, inv.email, s, tz
			);

			// Verify response
			assert.notExists(res.Fault, `${tz} meeting not fault`);
			assert.exists(res.CreateAppointmentResponse.invId, 'invId should exist');
		});
	});
});
