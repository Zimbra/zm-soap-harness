import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Timezones > Appointment-Timezone-Part3', function () {
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const token = await soap.getAccountAuthToken(email);
		return { email, token };
	}

	async function createTzAppt(token, email, subject, tzId) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}" tz="${tzId}"/>
							<e d="${t2}" tz="${tzId}"/>
							<or a="${email}"/>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, token
		);
		return res;
	}

	const tzIds = [
		'Asia/Tokyo', 'Asia/Shanghai',
		'Asia/Hong_Kong', 'Asia/Singapore',
		'Asia/Kolkata', 'Asia/Seoul',
		'Asia/Taipei', 'Asia/Bangkok',
		'Asia/Jakarta', 'Asia/Karachi',
		'Asia/Dhaka', 'Asia/Colombo',
		'Asia/Kathmandu', 'Asia/Almaty',
		'Asia/Tashkent', 'Asia/Yekaterinburg',
		'Asia/Omsk', 'Asia/Novosibirsk',
		'Asia/Krasnoyarsk', 'Asia/Irkutsk',
		'Asia/Yakutsk', 'Asia/Vladivostok',
		'Asia/Magadan', 'Asia/Kamchatka',
		'Asia/Anadyr', 'Asia/Dubai',
		'Asia/Muscat', 'Asia/Riyadh',
		'Asia/Baghdad', 'Asia/Tehran',
		'Asia/Kabul', 'Asia/Baku',
		'Asia/Tbilisi', 'Asia/Yerevan',
		'Asia/Samarkand', 'Asia/Bishkek',
		'Asia/Dushanbe', 'Asia/Ashgabat',
		'Asia/Kuala_Lumpur', 'Asia/Manila',
		'Asia/Ho_Chi_Minh', 'Asia/Rangoon',
		'Asia/Phnom_Penh', 'Asia/Vientiane',
		'Asia/Brunei', 'Asia/Makassar',
		'Asia/Jayapura', 'Asia/Dili',
		'Asia/Choibalsan', 'Asia/Ulaanbaatar'
	];


	// Appointment-Timezone tests (50 of 149)
	tzIds.forEach((tz) => {
		it(`Sanity | TZ create - ${tz}`, async () => {
			const acct = await makeAcct('tz');
			const s = `Subj${common.getUniqueString()}`;
			const res = await createTzAppt(
				acct.token, acct.email, s, tz
			);

			// Verify response
			assert.notExists(res.Fault, `${tz} should not fault`);
		});
	});
});
