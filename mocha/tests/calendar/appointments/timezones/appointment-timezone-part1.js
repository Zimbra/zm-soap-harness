import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Timezones > Appointment-Timezone-Part1', function () {
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
		'America/New_York', 'America/Chicago',
		'America/Denver', 'America/Los_Angeles',
		'America/Anchorage', 'Pacific/Honolulu',
		'America/Phoenix', 'America/Indiana/Indianapolis',
		'America/Boise', 'America/Juneau',
		'US/Eastern', 'US/Central',
		'US/Mountain', 'US/Pacific',
		'US/Alaska', 'US/Hawaii',
		'America/Detroit', 'America/Kentucky/Louisville',
		'America/Menominee', 'America/North_Dakota/Center',
		'America/Adak', 'America/Nome',
		'America/Metlakatla', 'America/Yakutat',
		'America/Sitka', 'America/Atka',
		'America/Fort_Wayne', 'America/Indianapolis',
		'America/Knox_IN', 'America/Louisville',
		'America/Indiana/Vincennes', 'America/Indiana/Winamac',
		'America/Indiana/Marengo', 'America/Indiana/Petersburg',
		'America/Indiana/Tell_City', 'America/Indiana/Vevay',
		'America/North_Dakota/Beulah', 'America/North_Dakota/New_Salem',
		'America/North_Dakota/Center', 'America/Kentucky/Monticello',
		'America/Argentina/Buenos_Aires',
		'America/Argentina/Cordoba',
		'America/Argentina/Salta',
		'America/Argentina/Tucuman',
		'America/Argentina/La_Rioja',
		'America/Argentina/San_Juan',
		'America/Argentina/Jujuy',
		'America/Argentina/Catamarca',
		'America/Argentina/Mendoza',
		'America/Argentina/San_Luis'
	];


	// Appointment-Timezone tests (50 of 149)
	tzIds.forEach((tz, i) => {
		const type = i === 0 ? 'Smoke' : 'Sanity';
		it(`${type} | TZ create - ${tz}`, async () => {
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
