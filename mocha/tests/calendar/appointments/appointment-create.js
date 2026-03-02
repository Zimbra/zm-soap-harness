import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Appointment Create', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    let acct1, acct2;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function icalTimeFromEpoch(epochMs) {
        const d = new Date(epochMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

    function futureTime(offsetMs) {
        return icalTimeFromEpoch(Date.now() + offsetMs);
    }

    function curDate() {
        const d = new Date();
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    }

    async function makeAcct(prefix) {
        const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
        const res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const id = res.CreateAccountResponse.account[0].id;
        const token = await soap.getAccountAuthToken(email);
        return { email, id, token };
    }

    async function createAppt(token, orgEmail, subject, opts) {
        const loc = opts.loc || '';
        const at = (opts.attendees || []).map(
            a => `<at role="OPT" ptst="NE" rsvp="1" a="${a}"/>`
        ).join('');
        const eTo = (opts.attendees || []).map(
            a => `<e a="${a}" t="t"/>`
        ).join('');
        const recur = opts.recur || '';
        const locAttr = loc ? ` loc="${loc}"` : '';
        const allDay = opts.allDay || '0';
        const fb = opts.fb || 'B';
        const cls = opts.cls ? ` class="${opts.cls}"` : '';
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="${fb}" transp="O"
						allDay="${allDay}" name="${subject}"${locAttr}${cls}>
						${at}
						<s d="${opts.start}"/>
						<e d="${opts.end}"/>
						<or a="${orgEmail}"/>
						${recur}
					</inv>
					${eTo}
					<mp content-type="text/plain">
						<content>Content${common.getUniqueString()}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, token
        );
        return res;
    }

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
        acct1 = await makeAcct('acct1');
        acct2 = await makeAcct('acct2');
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

    // ---- Single occurrence basic tests ----

    it('Regression | Create appointment starting 1h before ending 30m before', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(-3600000), end: futureTime(-1800000),
            loc: `Loc${common.getUniqueString()}`, attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment starting and ending yesterday', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(-86400000),
            end: futureTime(-86400000 + 1800000),
            loc: `Loc${common.getUniqueString()}`, attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment with non-existing attendee', async () => {
        const nonExist = `nonex${common.getUniqueString()}@${testDomain}`;
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(-3600000), end: futureTime(-1800000),
            attendees: [nonExist]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment same start and end time', async () => {
        const t = futureTime(1800000);
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: t, end: t, attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment ending before start time', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(3600000), end: futureTime(-86400000),
            attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment with alphabetic start/end time', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: 'aaaa', end: 'bbbb', attendees: [acct2.email]
        });
        assert.exists(r.Fault, 'Should fault with invalid time');
    });

    it('Smoke | Create appointment inviting multiple people', async () => {
        const acct4 = await makeAcct('acct4');
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email, acct4.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment with one invalid attendee in multi', async () => {
        const invalid = `test${common.getUniqueString()}@@${testDomain}`;
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email, invalid]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create appointment with deleted attendee', async () => {
        const acct6 = await makeAcct('acct6');
        await soap.makeSOAPEnvelopeAdmin(
            `<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct6.id}</id>
			</DeleteAccountRequest>`, adminAuthToken
        );
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct6.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Daily recurrence tests ----

    it('Smoke | Create daily appointment never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(1800000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="DAI" ival="1"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create daily appointment ending in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="DAI" ival="1"><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create daily appointment ending same day', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="DAI" ival="1"><until d="${curDate()}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create daily appointment ending after 2 times', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="DAI" ival="1" count="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create daily appointment every 2 days never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="DAI" ival="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create daily appointment every 2 days ending in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="DAI" ival="2"><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Weekly recurrence tests ----

    it('Smoke | Create weekly appointment never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="1"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment ending in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="1"><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create weekly appointment ending same day', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="1"><until d="${curDate()}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment ending after 2 times', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="1" count="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment every 2 weeks never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment every 2 weeks ending in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="2"><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Monthly recurrence tests ----

    it('Smoke | Create monthly appointment never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create monthly appointment ending in 6 months', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="1"><until d="${futureTime(180 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create monthly appointment ending same day', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="1"><until d="${curDate()}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create monthly appointment ending after 2 times', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1" count="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create monthly appointment every 2 months never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create monthly appointment every 2 months in 6 months', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="2"><until d="${futureTime(180 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment on 15th never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><bymonthday modaylist="15"/></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment on 15th ending in 6 months', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="1"><bymonthday modaylist="15"/><until d="${futureTime(180 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create monthly appointment on 15th ending same day', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="1"><bymonthday modaylist="15"/><until d="${curDate()}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create monthly appointment on 15th ending after 2', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1" count="2"><bymonthday modaylist="15"/></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment for 2-3 date that never end', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><bymonthday modaylist="2,3"/></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment for 2-3 and end of month', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="1"><bymonthday modaylist="2,3"/><until d="${futureTime(180 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Yearly recurrence tests ----

    it('Smoke | Create yearly appointment never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="YEA" ival="1"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create yearly appointment ending in 3 years', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="YEA" ival="1"><until d="${futureTime(1080 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Regression | Create yearly appointment ending same day', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="YEA" ival="1"><until d="${curDate()}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create yearly appointment ending after 2 times', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="YEA" ival="1" count="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create yearly appointment every 2 years never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="YEA" ival="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create yearly appointment every 2 years in 3 years', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="YEA" ival="2"><until d="${futureTime(1080 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Weekly by day tests ----

    it('Smoke | Create weekly appointment on Monday never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="1"><byday><wkday day="MO"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment on Monday ending in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="1"><byday><wkday day="MO"/></byday><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment on Mon,Tue,Wed never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="1"><byday><wkday day="MO"/><wkday day="TU"/><wkday day="WE"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create weekly appointment on Mon,Tue,Wed in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="1"><byday><wkday day="MO"/><wkday day="TU"/><wkday day="WE"/></byday><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create weekly appointment on weekdays never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="1"><byday><wkday day="MO"/><wkday day="TU"/><wkday day="WE"/><wkday day="TH"/><wkday day="FR"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create weekly appointment on weekdays in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="1"><byday><wkday day="MO"/><wkday day="TU"/><wkday day="WE"/><wkday day="TH"/><wkday day="FR"/></byday><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create weekly appointment on all days never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="WEE" ival="1"><byday><wkday day="SU"/><wkday day="MO"/><wkday day="TU"/><wkday day="WE"/><wkday day="TH"/><wkday day="FR"/><wkday day="SA"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create weekly appointment on all days in 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="WEE" ival="1"><byday><wkday day="SU"/><wkday day="MO"/><wkday day="TU"/><wkday day="WE"/><wkday day="TH"/><wkday day="FR"/><wkday day="SA"/></byday><until d="${futureTime(30 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Monthly by day tests ----

    it('Functional | Create monthly appointment 1st Mon never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><byday><wkday day="MO" ordwk="1"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment 1st Mon in 6 months', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: `<recur><add><rule freq="MON" ival="1"><byday><wkday day="MO" ordwk="1"/></byday><until d="${futureTime(180 * 86400000).substring(0, 8)}"/></rule></add></recur>`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment last Mon never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><byday><wkday day="MO" ordwk="-1"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment 2nd Mon never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><byday><wkday day="MO" ordwk="2"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment 3rd Tue never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><byday><wkday day="TU" ordwk="3"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment 4th Wed never ending', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email],
            recur: '<recur><add><rule freq="MON" ival="1"><byday><wkday day="WE" ordwk="4"/></byday></rule></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- All-day tests ----

    it('Smoke | Create an all day appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: curDate(), end: curDate(),
            attendees: [acct2.email], allDay: '1', fb: 'F'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create an all day recurring daily appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: curDate(), end: curDate(),
            attendees: [acct2.email], allDay: '1', fb: 'F',
            recur: '<recur><add><rule freq="DAI" ival="1" count="5"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create an all day recurring weekly appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: curDate(), end: curDate(),
            attendees: [acct2.email], allDay: '1', fb: 'F',
            recur: '<recur><add><rule freq="WEE" ival="1" count="4"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create an all day recurring monthly appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: curDate(), end: curDate(),
            attendees: [acct2.email], allDay: '1', fb: 'F',
            recur: '<recur><add><rule freq="MON" ival="1" count="3"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create an all day recurring yearly appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: curDate(), end: curDate(),
            attendees: [acct2.email], allDay: '1', fb: 'F',
            recur: '<recur><add><rule freq="YEA" ival="1" count="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Private/class tests ----

    it('Smoke | Create a private appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email], cls: 'PRI'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create a confidential appointment', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            attendees: [acct2.email], cls: 'CON'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Location and various attribute tests ----

    it('Smoke | Create appointment with location', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            loc: `Conference${common.getUniqueString()}`
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create appointment without attendee', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000)
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create appointment with free/busy as free', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            fb: 'F', attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Sanity | Create appointment with free/busy as tentative', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            fb: 'T', attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create appointment far in future 30 days', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(30 * 86400000),
            end: futureTime(30 * 86400000 + 3600000),
            attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create appointment 30 days in the past', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(-30 * 86400000),
            end: futureTime(-30 * 86400000 + 3600000),
            attendees: [acct2.email]
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    // ---- Bug-related and edge case tests ----

    it('Functional | Create appointment with long subject', async () => {
        const s = `Subject${'x'.repeat(200)}${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000)
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create appointment with special chars in subject', async () => {
        const s = `Test &amp; Meeting &lt;${common.getUniqueString()}&gt;`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000)
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create multiple appointments rapidly', async () => {
        for (let i = 0; i < 5; i++) {
            const s = `Rapid${i}${common.getUniqueString()}`;
            const r = await createAppt(acct1.token, acct1.email, s, {
                start: futureTime(1800000 + i * 3600000),
                end: futureTime(3600000 + i * 3600000)
            });
            assert.notExists(r.Fault, `Appointment ${i} should not fault`);
        }
    });

    it('Functional | Create appointment with alarm', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const token = acct1.token;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${s}">
						<s d="${futureTime(1800000)}"/>
						<e d="${futureTime(3600000)}"/>
						<or a="${acct1.email}"/>
						<alarm action="DISPLAY">
							<trigger>
								<rel related="START" neg="1" m="15"/>
							</trigger>
							<desc>Reminder</desc>
						</alarm>
					</inv>
					<mp content-type="text/plain">
						<content>Content with alarm</content>
					</mp>
					<su>${s}</su>
				</m>
			</CreateAppointmentRequest>`, token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });

    it('Functional | Create appointment in custom folder', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const folderName = `cal${common.getUniqueString()}`;
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', acct1.token
        );
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder
            : [folderRes.GetFolderResponse.folder];
        const rootId = folders[0].id;
        const cfRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${rootId}" view="appointment"/>
			</CreateFolderRequest>`, acct1.token
        );
        const folderId = Array.isArray(cfRes.CreateFolderResponse.folder)
            ? cfRes.CreateFolderResponse.folder[0].id
            : cfRes.CreateFolderResponse.folder.id;

        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${s}">
						<s d="${futureTime(1800000)}"/>
						<e d="${futureTime(3600000)}"/>
						<or a="${acct1.email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${s}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });

    it('Functional | Create daily appointment every 3 days count 4', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            recur: '<recur><add><rule freq="DAI" ival="3" count="4"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create weekly appointment every 3 weeks count 3', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            recur: '<recur><add><rule freq="WEE" ival="3" count="3"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create monthly appointment every 3 months count 3', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            recur: '<recur><add><rule freq="MON" ival="3" count="3"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create yearly appointment every 2 years count 2', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const r = await createAppt(acct1.token, acct1.email, s, {
            start: futureTime(1800000), end: futureTime(3600000),
            recur: '<recur><add><rule freq="YEA" ival="2" count="2"/></add></recur>'
        });
        assert.notExists(r.Fault, 'Should not fault');
    });

    it('Functional | Create appointment with email reminder', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${s}">
						<s d="${futureTime(1800000)}"/>
						<e d="${futureTime(3600000)}"/>
						<or a="${acct1.email}"/>
						<alarm action="EMAIL">
							<trigger>
								<rel related="START" neg="1" m="30"/>
							</trigger>
							<desc>Email Reminder</desc>
						</alarm>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${s}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });

    it('Functional | Create appointment with HTML content', async () => {
        const s = `Subj${common.getUniqueString()}`;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${s}">
						<s d="${futureTime(1800000)}"/>
						<e d="${futureTime(3600000)}"/>
						<or a="${acct1.email}"/>
					</inv>
					<mp content-type="text/html">
						<content>&lt;html&gt;&lt;body&gt;&lt;b&gt;Bold content&lt;/b&gt;&lt;/body&gt;&lt;/html&gt;</content>
					</mp>
					<su>${s}</su>
				</m>
			</CreateAppointmentRequest>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
    });
});
