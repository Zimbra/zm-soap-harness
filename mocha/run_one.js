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
    const res = await soap.makeSOAPEnvelopeAccount(
        `<SearchRequest xmlns="urn:zimbraMail" types="message">
            <query> from:(foo) in:"foldertext13.01" </query>
        </SearchRequest>`, accountAuthToken
    );
    console.log(JSON.stringify(res, null, 2));
}
run().catch(console.error);
