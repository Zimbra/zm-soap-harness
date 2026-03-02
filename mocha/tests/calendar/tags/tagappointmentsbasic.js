import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Tags > TagAppointmentsBasic', function () {
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

    async function makeAcctAndAppt() {
        const email = `acct${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const token = await soap.getAccountAuthToken(email);
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

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
        return { email, token, subject, calItemId };
    }


    it('Smoke | Tag an appointment using ItemActionRequest', async () => {
        const ctx = await makeAcctAndAppt();
        const tagName = `tag${common.getUniqueString()}`;
        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, ctx.token
        );
        const tagId = tagRes.CreateTagResponse.tag[0].id;

        const actionRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, ctx.token
        );
        assert.notExists(actionRes.Fault, 'Tag action should not fault');

        // Verify tag is present
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${ctx.calItemId}"/>`, ctx.token
        );
        assert.exists(
            getRes.GetAppointmentResponse.appt[0].t,
            'Tag should be on appointment'
        );
    });


    it('Sanity | Untag an appointment using ItemActionRequest', async () => {
        const ctx = await makeAcctAndAppt();
        const tagName = `tag${common.getUniqueString()}`;
        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, ctx.token
        );
        const tagId = tagRes.CreateTagResponse.tag[0].id;

        // Tag, then untag
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, ctx.token
        );
        const actionRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="!tag" tag="${tagId}"/>
			</ItemActionRequest>`, ctx.token
        );
        assert.notExists(actionRes.Fault, 'Untag action should not fault');
    });


    it('Sanity | Apply two tags to an appointment', async () => {
        const ctx = await makeAcctAndAppt();
        const tagName1 = `tag1${common.getUniqueString()}`;
        const tagName2 = `tag2${common.getUniqueString()}`;

        const tag1Res = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName1}" color="1"/>
			</CreateTagRequest>`, ctx.token
        );
        const tag2Res = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName2}" color="2"/>
			</CreateTagRequest>`, ctx.token
        );
        const tagId1 = tag1Res.CreateTagResponse.tag[0].id;
        const tagId2 = tag2Res.CreateTagResponse.tag[0].id;

        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="tag" tag="${tagId1}"/>
			</ItemActionRequest>`, ctx.token
        );
        await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="tag" tag="${tagId2}"/>
			</ItemActionRequest>`, ctx.token
        );

        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${ctx.calItemId}"/>`, ctx.token
        );
        const tags = getRes.GetAppointmentResponse.appt[0].t;
        assert.exists(tags, 'Tags should be present');
        assert.include(tags, tagId1, 'Tag 1 should be present');
        assert.include(tags, tagId2, 'Tag 2 should be present');
    });


    it('Sanity | Apply tag to received non-owned appointment', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attEmail = `att${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, attEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const attToken = await soap.getAccountAuthToken(attEmail);
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        // Org creates appointment with attendee
        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${attEmail}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${orgEmail}"/>
					</inv>
					<e a="${attEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );

        await new Promise(r => setTimeout(r, 2000));

        // Attendee creates tag and searches for appointment
        const tagName = `tag${common.getUniqueString()}`;
        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="3"/>
			</CreateTagRequest>`, attToken
        );
        assert.notExists(tagRes.Fault, 'CreateTag should not fault');
        const tagId = tagRes.CreateTagResponse.tag[0].id;

        // Search for the appointment
        const now = Date.now();
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"/>`,
            attToken
        );
        if (searchRes.GetApptSummariesResponse.appt) {
            const appts = Array.isArray(searchRes.GetApptSummariesResponse.appt)
                ? searchRes.GetApptSummariesResponse.appt
                : [searchRes.GetApptSummariesResponse.appt];
            const found = appts.find(a => a.name === subject);
            if (found) {
                const actionRes = await soap.makeSOAPEnvelopeAccount(
                    `<ItemActionRequest xmlns="urn:zimbraMail">
						<action id="${found.id}" op="tag"
							tag="${tagId}"/>
					</ItemActionRequest>`, attToken
                );
                assert.notExists(
                    actionRes.Fault,
                    'Tag on received appointment should not fault'
                );
            }
        }
    });


    it('Sanity | Tag appointment using SetAppointmentRequest', async () => {
        const ctx = await makeAcctAndAppt();
        const tagName = `tag${common.getUniqueString()}`;
        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, ctx.token
        );
        const tagId = tagRes.CreateTagResponse.tag[0].id;

        // Tag using ItemAction (SetAppointmentRequest equivalent)
        const actionRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action id="${ctx.calItemId}" op="tag" tag="${tagId}"/>
			</ItemActionRequest>`, ctx.token
        );
        assert.notExists(actionRes.Fault, 'Tag should not fault');

        // Verify tag is set
        const getRes = await soap.makeSOAPEnvelopeAccount(
            `<GetAppointmentRequest xmlns="urn:zimbraMail"
				id="${ctx.calItemId}"/>`, ctx.token
        );
        assert.exists(
            getRes.GetAppointmentResponse.appt[0].t,
            'Tag should be on appointment'
        );
    });


    it('Sanity | Tag received appointment using SetAppointmentRequest', async () => {
        const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
        const attEmail = `att${common.getUniqueString()}@${testDomain}`;
        for (const email of [orgEmail, attEmail]) {
            await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${email}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
        }
        const orgToken = await soap.getAccountAuthToken(orgEmail);
        const attToken = await soap.getAccountAuthToken(attEmail);
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(1800000);
        const t2 = futureTime(3600000);

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}">
						<at role="REQ" ptst="NE" rsvp="1" a="${attEmail}"/>
						<s d="${t1}"/>
						<e d="${t2}"/>
						<or a="${orgEmail}"/>
					</inv>
					<e a="${attEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
        );

        await new Promise(r => setTimeout(r, 2000));

        const tagRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="rcvdTag${common.getUniqueString()}" color="5"/>
			</CreateTagRequest>`, attToken
        );
        assert.notExists(tagRes.Fault, 'CreateTag should not fault');
        const tagId = tagRes.CreateTagResponse.tag[0].id;

        const now = Date.now();
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 2 * 86400000}"/>`,
            attToken
        );
        if (searchRes.GetApptSummariesResponse.appt) {
            const appts = Array.isArray(searchRes.GetApptSummariesResponse.appt)
                ? searchRes.GetApptSummariesResponse.appt
                : [searchRes.GetApptSummariesResponse.appt];
            const found = appts.find(a => a.name === subject);
            if (found) {
                const actionRes = await soap.makeSOAPEnvelopeAccount(
                    `<ItemActionRequest xmlns="urn:zimbraMail">
						<action id="${found.id}" op="tag"
							tag="${tagId}"/>
					</ItemActionRequest>`, attToken
                );
                assert.notExists(
                    actionRes.Fault,
                    'Tag on received appointment should not fault'
                );
            }
        }
    });
});
