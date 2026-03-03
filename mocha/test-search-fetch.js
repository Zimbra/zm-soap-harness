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

    const values = ['!@#$%', '12345', '-1', 'sometext', 'abcdef', '   '];
    for(const val of values) {
      let res = await soap.makeSOAPEnvelopeAccount(
          `<SearchRequest xmlns="urn:zimbraMail" types="message,appointment" fetch="${val}">
              <query>subject:(test mail)</query>
          </SearchRequest>`, accountAuthToken, false
      );
      if(res.Fault) {
        console.log(`Value '${val}' faulted with ${res.Fault.Detail?.Error?.Code}`);
      } else {
        console.log(`Value '${val}' succeeded`);
      }
    }
}
run().catch(console.error);
