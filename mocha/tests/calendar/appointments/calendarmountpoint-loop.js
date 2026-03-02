import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Appointments > CalendarMountpoint-Loop', function () {
    this.timeout(300 * 1000);
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
    it('Functional | Verify a shared calendar can be mounted in a loop', async () => {
        // Create account1
        const account1Email = `test${common.getUniqueString()}@${testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const account1Token = await soap.getAccountAuthToken(account1Email);

        // Get account1 folder info
        const folderRes = await soap.makeSOAPEnvelopeAccount(
            '<GetFolderRequest xmlns="urn:zimbraMail"/>', account1Token
        );
        assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');
        const folders = Array.isArray(folderRes.GetFolderResponse.folder)
            ? folderRes.GetFolderResponse.folder : [folderRes.GetFolderResponse.folder];
        const rootId = folders[0].id;

        // Loop: create accounts, share calendar, mount
        const loopCount = 5;
        for (let i = 0; i < loopCount; i++) {
            const accountXEmail = `account${common.getUniqueString()}@${testDomain}`;
            const accRes = await soap.makeSOAPEnvelopeAdmin(
                `<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${accountXEmail}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
            );
            assert.notExists(accRes.Fault, 'CreateAccountRequest should not fault');
            const accountXId = accRes.CreateAccountResponse.account[0].id;
            const accountXToken = await soap.getAccountAuthToken(accountXEmail);

            // Get accountX calendar folder
            const xFolderRes = await soap.makeSOAPEnvelopeAccount(
                '<GetFolderRequest xmlns="urn:zimbraMail"/>', accountXToken
            );
            const xFolders = Array.isArray(xFolderRes.GetFolderResponse.folder)
                ? xFolderRes.GetFolderResponse.folder
                : [xFolderRes.GetFolderResponse.folder];
            const xAllFolders = Array.isArray(xFolders[0].folder)
                ? xFolders[0].folder : [xFolders[0].folder];
            const xCalFolder = xAllFolders.find(f => f.name === 'Calendar');

            // Share Calendar with account1
            const grantRes = await soap.makeSOAPEnvelopeAccount(
                `<FolderActionRequest xmlns="urn:zimbraMail">
					<action id="${xCalFolder.id}" op="grant">
						<grant d="${account1Email}" gt="usr" perm="rwidx"/>
					</action>
				</FolderActionRequest>`, accountXToken
            );
            assert.notExists(grantRes.Fault, 'FolderActionRequest should not fault');

            // Account1 creates mountpoint
            const mountRes = await soap.makeSOAPEnvelopeAccount(
                `<CreateMountpointRequest xmlns="urn:zimbraMail">
					<link l="${rootId}" name="Calendar${common.getUniqueString()}"
						view="appointment" rid="${xCalFolder.id}"
						zid="${accountXId}"/>
				</CreateMountpointRequest>`, account1Token
            );
            assert.notExists(mountRes.Fault, 'CreateMountpointRequest should not fault');
            assert.exists(
                mountRes.CreateMountpointResponse,
                'CreateMountpointResponse should exist'
            );
        }
    });
});
