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

    await soap.makeSOAPEnvelopeAccount(
        `<AddMsgRequest xmlns="urn:zimbraMail">
            <m l="2">
                <content>From: sender@example.com
To: ${accountEmail}
Subject: email01A
MIME-Version: 1.0
This is a simple text string in the body of the message</content>
                </m>
            </AddMsgRequest>`, accountAuthToken
    );

    // Give it a second to index
    await new Promise(r => setTimeout(r, 2000));

    let res = await soap.makeSOAPEnvelopeAccount(
        `<SearchRequest xmlns="urn:zimbraMail" types="message">
            <query>content:(simple text string in the body)</query>
        </SearchRequest>`, accountAuthToken
    );
    console.log("Query 1:", JSON.stringify(res, null, 2));

    let res2 = await soap.makeSOAPEnvelopeAccount(
        `<SearchRequest xmlns="urn:zimbraMail" types="message">
            <query>content:("simple text string in the body")</query>
        </SearchRequest>`, accountAuthToken
    );
    console.log("Query 2:", JSON.stringify(res2, null, 2));
}
run().catch(console.error);
