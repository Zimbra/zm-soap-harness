import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Import Upgrades 5-0-16', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    let accountEmail, accountAuthToken;

    before(async function () {
        await main.before(this);
        adminAuthToken = await soap.getAdminAuthToken();
        accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        accountAuthToken = await soap.getAccountAuthToken(accountEmail);
    });

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    it('Sanity | Verify basic account data after setup', async () => {
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
        assert.exists(folderRes.GetFolderResponse.folder, 'Root folder should exist');
    });

    it('Functional | Verify messages via search', async () => {
        const subject = `msg.${common.getUniqueString()}`;
        const recipient = `test.${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${recipient}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m><e t="t" a="${recipient}"/><su>${subject}</su><mp ct="text/plain"><content>test message</content></mp></m>
			</SendMsgRequest>`, accountAuthToken
        );
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject}) in:sent</query>
			</SearchRequest>`, accountAuthToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
    });

    it('Functional | Verify appointments via search', async () => {
        const subject = `appt.${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m><inv><comp status="CONF" fb="B" name="${subject}">
					<s d="20260301T120000Z"/><e d="20260301T130000Z"/>
				</comp></inv><su>${subject}</su><mp ct="text/plain"><content>test</content></mp></m>
			</CreateAppointmentRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
        assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');
    });

    it('Functional | Verify contacts data', async () => {
        const firstName = `Contact${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateContactRequest xmlns="urn:zimbraMail">
				<cn><a n="firstName">${firstName}</a><a n="lastName">Test</a><a n="email">${firstName}@test.com</a></cn>
			</CreateContactRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateContactRequest should not fault');
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="contact">
				<query>contact:(${firstName})</query>
			</SearchRequest>`, accountAuthToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
        assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
    });

    it('Functional | Verify folders data', async () => {
        const folderName = `folder${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateFolderRequest should not fault');
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            `<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        assert.exists(folderRes.GetFolderResponse, 'GetFolderResponse should exist');
    });

    it('Functional | Verify tags data', async () => {
        const tagName = `tag${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="1"/>
			</CreateTagRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateTagRequest should not fault');
        assert.exists(createRes.CreateTagResponse, 'CreateTagResponse should exist');
    });

    it('Functional | Verify wiki/notebook via folder', async () => {
        const folderName = `wiki${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1" view="wiki"/>
			</CreateFolderRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateFolderRequest wiki should not fault');
        assert.exists(createRes.CreateFolderResponse, 'CreateFolderResponse should exist');
    });

    it('Functional | Verify briefcase via folder', async () => {
        const folderName = `briefcase${common.getUniqueString()}`;
        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1" view="document"/>
			</CreateFolderRequest>`, accountAuthToken
        );
        assert.notExists(createRes.Fault, 'CreateFolderRequest briefcase should not fault');
        assert.exists(createRes.CreateFolderResponse, 'CreateFolderResponse should exist');
    });
});
