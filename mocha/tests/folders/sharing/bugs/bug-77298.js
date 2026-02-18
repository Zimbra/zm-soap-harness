import { assert } from 'chai';
import https from 'https';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Bugs > Bug 77298', function () {
    let testAccount1, guestAccount1;
    let auth1;
    let account1Id;
    let folderName, folderId;

    const makeRESTRequest = (options) => {
        return new Promise((resolve, reject) => {
            const reqOptions = {
                hostname: config.serverHost,
                port: config.clientPort,
                path: options.path,
                method: 'GET',
                rejectUnauthorized: false,
                agent: new https.Agent({ rejectUnauthorized: false }),
                headers: {}
            };

            if (options.username) {
                // Basic Auth
                const auth = Buffer.from(`${options.username}:${options.password || ''}`).toString('base64');
                reqOptions.headers['Authorization'] = `Basic ${auth}`;
            }

            const req = https.request(reqOptions, (res) => {
                resolve(res.statusCode);
            });

            req.on('error', (e) => reject(e));
            req.end();
        });
    };

    before(async function () {
        testAccount1 = `bug77298_1_${common.getUniqueString()}@${config.testDomain}`;
        guestAccount1 = `guest1${common.getUniqueString()}@${config.testDomain}`;

        const adminAuth = await soap.getAdminAuthToken();
        const res = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
        account1Id = res.accountId;

        auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

        // Get Root Folder
        const getFolder = await soap.makeSOAPEnvelopeAccount(`<GetFolderRequest xmlns="urn:zimbraMail"/>`, auth1);
        const rootId = getFolder.GetFolderResponse.folder[0].id;

        // Create Folder
        folderName = `folder${common.getUniqueString()}`;
        const createResp = await soap.makeSOAPEnvelopeAccount(
            `<CreateFolderRequest xmlns="urn:zimbraMail">
                <folder l="${rootId}" name="${folderName}" view="document"/>
            </CreateFolderRequest>`, auth1);
        folderId = createResp.CreateFolderResponse.folder[0].id;
    });

    after(async function () {
        const adminAuth = await soap.getAdminAuthToken();
        if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
    });


    it('Sanity | Verify external share cannot be accessed without a password (pw="")', async function () {
        // Share with gt=guest and pw=""
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="guest" d="${guestAccount1}" pw="" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        // Guest send REST request without password
        const path = `/service/home/${testAccount1}/${folderName}`;
        let statusCode = await makeRESTRequest({
            path: path,
            username: guestAccount1
        });
        assert.equal(statusCode, 401, 'Should return 401 Unauthorized for request without password');

        // Guest send REST request with blank password?
        statusCode = await makeRESTRequest({
            path: path,
            username: guestAccount1,
            password: ''
        });
        assert.equal(statusCode, 401, 'Should return 401 Unauthorized for request with empty password');
    });


    it('Sanity | Verify external share cannot be accessed without a password (no pw attribute)', async function () {
        // Share with gt=guest and without pw attribute
        await soap.makeSOAPEnvelopeAccount(
            `<FolderActionRequest xmlns="urn:zimbraMail">
                <action op="grant" id="${folderId}">
                    <grant gt="guest" d="${guestAccount1}" perm="rwidx"/>
                </action>
            </FolderActionRequest>`, auth1);

        const path = `/service/home/${testAccount1}/${folderName}`;
        let statusCode = await makeRESTRequest({
            path: path,
            username: guestAccount1
        });
        assert.equal(statusCode, 401, 'Should return 401 Unauthorized for request without password');
    });

});
