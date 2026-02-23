import config from './mocha/conf/config.js';
import soap from './mocha/framework/backend/soap-client.js';

async function run() {
    let adminAuth = await soap.getAdminAuthToken();
    let res = await soap.makeSOAPEnvelope(
        `<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${config.adminEmailAddress}</account>
				<password>${config.adminPassword}</password>
			</AuthRequest>`, '');
    console.log(JSON.stringify(res, null, 2));
}
run();
