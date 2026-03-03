import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Appointment Search', function () {
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
    it('Smoke | Search for an appointment by its subject', async () => {
        // Create account
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const now = Date.now();

        // Create appointment
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountEmail}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${accountEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

        // Search by subject with inid
        const searchRes1 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}(inid:10)</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes1.Fault, 'SearchRequest should not fault');
        const appts1 = Array.isArray(searchRes1.SearchResponse.appt)
            ? searchRes1.SearchResponse.appt : [searchRes1.SearchResponse.appt];
        assert.exists(appts1[0].name, 'Appointment name should exist');

        // Search with fetch=all
        const searchRes2 = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}" fetch="all">
				<query>${subject}</query>
			</SearchRequest>`, accountToken
        );
        assert.notExists(searchRes2.Fault, 'SearchRequest should not fault');
        const appts2 = Array.isArray(searchRes2.SearchResponse.appt)
            ? searchRes2.SearchResponse.appt : [searchRes2.SearchResponse.appt];
        assert.exists(appts2[0].name, 'Appointment name should exist');
    });


    it('Regression | Create a search folder for appointment search', async () => {
        // Create account
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);
        const subject = `Subject of meeting${common.getUniqueString()}`;
        const now = Date.now();

        // Create appointment first
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${subject}" loc="Meeting Room 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${accountEmail}"/>
						<s d="${icalTime(30 * 60000)}"/>
						<e d="${icalTime(3600000)}"/>
						<or a="${accountEmail}"/>
					</inv>
					<e a="${accountEmail}" t="t"/>
					<mp content-type="text/plain">
						<content>Content of the message</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, accountToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(createRes.CreateAppointmentResponse.invId, 'invId should exist');

        // Create search folder
        const searchName = `Search01${common.getUniqueString()}`;
        const createSearchRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="${subject}"
					types="appointment" sortBy="dateDesc" l="1" fetch="all"/>
			</CreateSearchFolderRequest>`, accountToken
        );
        assert.notExists(createSearchRes.Fault, 'CreateSearchFolderRequest should not fault');
        const search = createSearchRes.CreateSearchFolderResponse.search[0]
            || createSearchRes.CreateSearchFolderResponse.search;
        assert.exists(search.id, 'Search folder id should exist');

        // GetSearchFolderRequest
        const getSearchRes = await soap.makeSOAPEnvelopeAccount(
            '<GetSearchFolderRequest xmlns="urn:zimbraMail"/>',
            accountToken
        );
        assert.notExists(getSearchRes.Fault, 'GetSearchFolderRequest should not fault');
    });


    it('Regression | Delete the appointment search folder', async () => {
        // Create account
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // Create search folder
        const searchName = `Search02${common.getUniqueString()}`;
        const createSearchRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateSearchFolderRequest xmlns="urn:zimbraMail">
				<search name="${searchName}" query="test"
					types="appointment" sortBy="dateDesc" l="1" fetch="all"/>
			</CreateSearchFolderRequest>`, accountToken
        );
        assert.notExists(createSearchRes.Fault, 'CreateSearchFolderRequest should not fault');
        const search = createSearchRes.CreateSearchFolderResponse.search[0]
            || createSearchRes.CreateSearchFolderResponse.search;
        const searchFolderId = search.id;

        // Delete search folder
        const deleteRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${searchFolderId}"/>
			</FolderActionRequest>`, accountToken
        );
        assert.notExists(deleteRes.Fault, 'FolderActionRequest should not fault');
        assert.equal(deleteRes.FolderActionResponse.action.op, 'delete', 'Action op should be delete');
        assert.equal(deleteRes.FolderActionResponse.action.id, searchFolderId, 'Action id should match');
    });
});
