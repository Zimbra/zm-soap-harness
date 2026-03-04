import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > Appointment Import', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;

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
    it('Smoke | Import an appointment using uploadservlet', async () => {
        // Create account
        const accountEmail = `test${common.getUniqueString()}@${testDomain}`;
        const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
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
        const accountToken = await soap.getAccountAuthToken(accountEmail);

        // Upload ICS file
        const filePath = path.join(
            config.projectRoot, 'mocha/data/tests/basic.ics'
        );
        const aid = await soap.uploadFile(accountToken, filePath);

        // Get calendar folder ID
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // ImportAppointmentsRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ImportAppointmentsRequest xmlns="urn:zimbraMail"
				ct="ics" l="${calFolder.id}">
				<content aid="${aid}"/>
			</ImportAppointmentsRequest>`, accountToken
        );
        assert.notExists(res.Fault, 'ImportAppointmentsRequest should not fault');
        assert.notExists(
            res.Fault,
            'ImportAppointmentsResponse should exist'
        );
    });


    it('Sanity | Import an appointment using uploadservlet to a resource account', async () => {
        // Create calendar resource (location)
        const resourceName = `testresource1.${common.getUniqueString()}@${testDomain}`;
        const displayName = `TestName.${common.getUniqueString()}`;
        const resCreateRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resourceName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Location</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${displayName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(resCreateRes.Fault, 'CreateCalendarResourceRequest should not fault');

        // Login as resource
        const resourceToken = await soap.getAccountAuthToken(resourceName);

        // Get calendar folder
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', resourceToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // Upload ICS file
        const filePath = path.join(
            config.projectRoot, 'mocha/data/tests/basic.ics'
        );
        const aid = await soap.uploadFile(resourceToken, filePath);

        // ImportAppointmentsRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ImportAppointmentsRequest xmlns="urn:zimbraMail"
				ct="ics" l="${calFolder.id}">
				<content aid="${aid}"/>
			</ImportAppointmentsRequest>`, resourceToken
        );
        assert.notExists(res.Fault, 'ImportAppointmentsRequest should not fault');
        assert.notExists(
            res.Fault,
            'ImportAppointmentsResponse should exist'
        );
    });


    it('Sanity | Import an appointment using uploadservlet to a equipment', async () => {
        // Create calendar resource (equipment)
        const resourceName = `testresource2.${common.getUniqueString()}@${testDomain}`;
        const displayName = `TestName.${common.getUniqueString()}`;
        const resCreateRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateCalendarResourceRequest xmlns="urn:zimbraAdmin">
				<name>${resourceName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCalResType">Equipment</a>
				<a n="zimbraAccountStatus">active</a>
				<a n="displayName">${displayName}</a>
				<a n="zimbraCalResAutoAcceptDecline">TRUE</a>
				<a n="zimbraCalResAutoDeclineIfBusy">FALSE</a>
			</CreateCalendarResourceRequest>`, adminAuthToken
        );
        assert.notExists(resCreateRes.Fault, 'CreateCalendarResourceRequest should not fault');

        // Login as resource
        const resourceToken = await soap.getAccountAuthToken(resourceName);

        // Get calendar folder
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', resourceToken
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const allFolders = Array.isArray(folders[0].folder)
            ? folders[0].folder : [folders[0].folder];
        const calFolder = allFolders.find(f => f.name === 'Calendar');

        // Upload ICS file
        const filePath = path.join(
            config.projectRoot, 'mocha/data/tests/basic.ics'
        );
        const aid = await soap.uploadFile(resourceToken, filePath);

        // ImportAppointmentsRequest
        const res = await soap.makeSOAPEnvelopeAccount(
            `<ImportAppointmentsRequest xmlns="urn:zimbraMail"
				ct="ics" l="${calFolder.id}">
				<content aid="${aid}"/>
			</ImportAppointmentsRequest>`, resourceToken
        );
        assert.notExists(res.Fault, 'ImportAppointmentsRequest should not fault');
        assert.notExists(
            res.Fault,
            'ImportAppointmentsResponse should exist'
        );
    });
});
