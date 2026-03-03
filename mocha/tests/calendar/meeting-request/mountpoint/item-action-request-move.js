import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Meeting Request > Mountpoint > Item Action Request Move', function () {
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
    it('Deprecated | Move a meeting request between two calendars 1', async () => {
        // Create 3 accounts
        const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
        const acct1Id = acct1Res.CreateAccountResponse.account[0].id;
        const acct1Token = await soap.getAccountAuthToken(acct1Email);

        const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
        const acct2Token = await soap.getAccountAuthToken(acct2Email);

        const acct3Email = `acct3${common.getUniqueString()}@${testDomain}`;
        const acct3Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct3Res.Fault, 'CreateAccountRequest should not fault');
        const acct3Token = await soap.getAccountAuthToken(acct3Email);

        // Account1 gets root folder
        const folder1Res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Token
        );
        assert.notExists(folder1Res.Fault, 'GetFolderRequest should not fault');

        // Create calendar folder under account1
        const calName = `cal${common.getUniqueString()}`;
        const createFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${calName}" l="1" view="appointment"/>
			</CreateFolderRequest>`, acct1Token
        );
        assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
        const calFolderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
            ? createFolderRes.CreateFolderResponse.folder[0].id
            : createFolderRes.CreateFolderResponse.folder.id;

        // Share with account2 (manager rights)
        const grantRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calFolderId}" op="grant">
					<grant d="${acct2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct1Token
        );
        assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

        // Create meeting in account1's shared calendar
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m l="${calFolderId}">
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acct1Email}"/>
							<at a="${acct3Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${acct3Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct1Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const calItemId = createRes.CreateAppointmentResponse.calItemId;
        assert.exists(calItemId, 'calItemId should exist');

        // Account2 gets calendar folder
        const folder2Res = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2Token
        );
        assert.notExists(folder2Res.Fault, 'GetFolderRequest should not fault');

        // Move meeting from account1's calendar to account2's calendar
        const moveRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${acct1Id}:${calItemId}" l="10"/>
			</ItemActionRequest>`, acct2Token
        );
        assert.notExists(moveRes.Fault, 'ItemActionRequest should not fault');

        // Wait for server to process
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Account3 verifies appointment organizer
        const now = Date.now();
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, acct3Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.appt, 'Appointment should exist');
    });


    it('Deprecated | Move a meeting request between two calendars 2', async () => {
        // Create 3 accounts
        const acct1Email = `acct1${common.getUniqueString()}@${testDomain}`;
        const acct1Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct1Res.Fault, 'CreateAccountRequest should not fault');
        const acct1Id = acct1Res.CreateAccountResponse.account[0].id;
        const acct1Token = await soap.getAccountAuthToken(acct1Email);

        const acct2Email = `acct2${common.getUniqueString()}@${testDomain}`;
        const acct2Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct2Res.Fault, 'CreateAccountRequest should not fault');
        const acct2Token = await soap.getAccountAuthToken(acct2Email);

        const acct3Email = `acct3${common.getUniqueString()}@${testDomain}`;
        const acct3Res = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        assert.notExists(acct3Res.Fault, 'CreateAccountRequest should not fault');
        const acct3Token = await soap.getAccountAuthToken(acct3Email);

        // Account1 creates shared calendar folder
        const calName = `cal${common.getUniqueString()}`;
        const createFolderRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${calName}" l="1" view="appointment"/>
			</CreateFolderRequest>`, acct1Token
        );
        assert.notExists(createFolderRes.Fault, 'CreateFolderRequest should not fault');
        const calFolderId = Array.isArray(createFolderRes.CreateFolderResponse.folder)
            ? createFolderRes.CreateFolderResponse.folder[0].id
            : createFolderRes.CreateFolderResponse.folder.id;

        // Share with account2 (manager rights)
        const grantRes = await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${calFolderId}" op="grant">
					<grant d="${acct2Email}" gt="usr" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, acct1Token
        );
        assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

        // Account2 creates meeting in own calendar
        const subject = `Subj${common.getUniqueString()}`;
        const t1 = futureTime(3600000);
        const t2 = futureTime(7200000);
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${acct2Email}"/>
							<at a="${acct3Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${acct3Email}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct2Token
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        const calItemId = createRes.CreateAppointmentResponse.calItemId;
        assert.exists(calItemId, 'calItemId should exist');

        // Move meeting from account2's calendar to account1's shared calendar
        const moveRes = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${calItemId}"
					l="${acct1Id}:${calFolderId}"/>
			</ItemActionRequest>`, acct2Token
        );
        assert.notExists(moveRes.Fault, 'ItemActionRequest should not fault');

        // Wait for server to process
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Account3 verifies appointment
        const now = Date.now();
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, acct3Token
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse.appt, 'Appointment should exist');
    });
});
