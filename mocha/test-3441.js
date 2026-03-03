import { assert } from 'chai';
import config from './conf/config.js';
import common from './framework/core/common.js';
import soap from './framework/backend/soap-client.js';

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let adminAuthToken = await soap.getAdminAuthToken();
    let accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
    await soap.makeSOAPEnvelopeAdmin(
        `<CreateAccountRequest xmlns="urn:zimbraAdmin">
            <name>${accountEmail}</name>
            <password>${config.accountPassword}</password>
        </CreateAccountRequest>`, adminAuthToken
    );
    let accountAuthToken = await soap.getAccountAuthToken(accountEmail);

    const subject1 = `subject1_${common.getUniqueString()}`;
    for (let i = 0; i < 3; i++) {
        await soap.makeSOAPEnvelopeAccount(
            `<AddMsgRequest xmlns="urn:zimbraMail">
                <m l="2">
                    <content>From: ${accountEmail}
To: ${accountEmail}
Subject: ${subject1}
MIME-Version: 1.0

Test content message ${i}</content>
                    </m>
                </AddMsgRequest>`, accountAuthToken
        );
    }
    
    await new Promise(r => setTimeout(r, 2000));

    const folderRes = await soap.makeSOAPEnvelopeAccount(
        `<CreateFolderRequest xmlns="urn:zimbraMail">
            <folder name="target_${common.getUniqueString()}" l="1"/>
        </CreateFolderRequest>`, accountAuthToken
    );
    const folderId = folderRes.CreateFolderResponse.folder[0].id;

    const res4 = await soap.makeSOAPEnvelopeAccount(
        `<SearchActionRequest xmlns="urn:zimbraMail">
            <SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>subject:(${subject1})</query>
            </SearchRequest>
            <BulkAction op="move" l="${folderId}" />
        </SearchActionRequest>`, accountAuthToken, false
    );
    console.log(JSON.stringify(res4, null, 2));
}
run().catch(console.error);
