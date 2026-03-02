import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Tags > TagAppointments', function () {
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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    async function setupTaggedAppt() {
        const email = `acct${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const token = await soap.getAccountAuthToken(email);
        const tagName = `tag${common.getUniqueString()}`;
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        // Create tag
        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, token
        );
        const tagId = tagRes.CreateTagResponse.tag[0].id;

        // Create appointment
        const apptRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${email}"/>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, token
        );
        const calItemId = apptRes.CreateAppointmentResponse.calItemId;
        const invId = apptRes.CreateAppointmentResponse.invId;

        // Tag via ItemActionRequest
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${calItemId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, token
        );

        return { email, token, tagName, tagId, subject, calItemId, invId };
    }


    it('Smoke | GetAppointmentRequest shows tags', async () => {
        const ctx = await setupTaggedAppt();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${ctx.calItemId}"/>`, ctx.token
        );
        assert.notExists(res.Fault, 'GetAppointment should not fault');
        const appt = Array.isArray(res.GetAppointmentResponse.appt)
            ? res.GetAppointmentResponse.appt[0]
            : res.GetAppointmentResponse.appt;
        assert.ok(appt.t || appt.tn, 'Tag should be present on appointment');
    });


    it('Sanity | GetApptSummariesRequest shows tags', async () => {
        const ctx = await setupTaggedAppt();
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"/>`,
            ctx.token
        );
        assert.notExists(res.Fault, 'GetApptSummaries should not fault');
        const appts = Array.isArray(res.GetApptSummariesResponse.appt)
            ? res.GetApptSummariesResponse.appt
            : [res.GetApptSummariesResponse.appt];
        const found = appts.find(a => a.name === ctx.subject);
        assert.exists(found, 'Appointment should be found');
        assert.ok(found.t || found.tn, 'Tag should be present');
    });


    it('Sanity | SearchRequest for tag returns appointment', async () => {
        const ctx = await setupTaggedAppt();
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>tag:"${ctx.tagName}"</query>
			</SearchRequest>`, ctx.token
        );
        assert.notExists(res.Fault, 'SearchRequest should not fault');
        assert.exists(
            res.SearchResponse.appt,
            'Tagged appointment should be found'
        );
    });


    it('Sanity | Remove tag then search returns no appointment', async () => {
        const ctx = await setupTaggedAppt();

        // Remove the tag
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="!tag"
					tag="${ctx.tagId}"/>
			</ItemActionRequest>`, ctx.token
        );

        const res = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${Date.now() - 86400000}"
				calExpandInstEnd="${Date.now() + 2 * 86400000}">
				<query>tag:"${ctx.tagName}"</query>
			</SearchRequest>`, ctx.token
        );
        assert.notExists(res.Fault, 'SearchRequest should not fault');
        if (res.SearchResponse.appt) {
            const appts = Array.isArray(res.SearchResponse.appt)
                ? res.SearchResponse.appt
                : [res.SearchResponse.appt];
            const found = appts.find(a => a.name === ctx.subject);
            assert.notExists(
                found,
                'Appointment should not be found after untag'
            );
        }
    });
});
