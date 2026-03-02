import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Timezones > Appointment Timezone', function () {
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

    // Americas (Part 1 - 50 timezones)
    const tzAmericas = [
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

    // Europe (Part 2 - 50 timezones)
    const tzEurope = [
        'Europe/London', 'Europe/Paris',
        'Europe/Berlin', 'Europe/Rome',
        'Europe/Madrid', 'Europe/Amsterdam',
        'Europe/Brussels', 'Europe/Vienna',
        'Europe/Zurich', 'Europe/Stockholm',
        'Europe/Oslo', 'Europe/Copenhagen',
        'Europe/Helsinki', 'Europe/Warsaw',
        'Europe/Prague', 'Europe/Budapest',
        'Europe/Bucharest', 'Europe/Sofia',
        'Europe/Athens', 'Europe/Istanbul',
        'Europe/Moscow', 'Europe/Kiev',
        'Europe/Lisbon', 'Europe/Dublin',
        'Europe/Belgrade', 'Europe/Bratislava',
        'Europe/Ljubljana', 'Europe/Sarajevo',
        'Europe/Skopje', 'Europe/Zagreb',
        'Europe/Minsk', 'Europe/Vilnius',
        'Europe/Riga', 'Europe/Tallinn',
        'Europe/Kaliningrad', 'Europe/Simferopol',
        'Europe/Samara', 'Europe/Volgograd',
        'Europe/Chisinau', 'Europe/Luxembourg',
        'Europe/Malta', 'Europe/Monaco',
        'Europe/Tirane', 'Europe/Andorra',
        'Europe/Gibraltar', 'Europe/Guernsey',
        'Europe/Isle_of_Man', 'Europe/Jersey',
        'Europe/San_Marino', 'Europe/Vatican'
    ];

    // Asia & Others (Part 3 - 49 timezones)
    const tzAsia = [
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
        'Asia/Choibalsan'
    ];

    const allTzIds = [...tzAmericas, ...tzEurope, ...tzAsia];

    // Appointment-Timezone tests (149 timezones)
    allTzIds.forEach((tz, i) => {
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
