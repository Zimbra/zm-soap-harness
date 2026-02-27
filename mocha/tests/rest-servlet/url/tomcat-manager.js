import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';

describe('RestServlet > URL > Tomcat Manager', function () {
	this.timeout(120 * 1000);

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that Tomcat Manager is not accessible via REST', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();
		const res = await soap.makeRestRequest(adminAuthToken, {
			user: 'admin',
			folder: '../manager/html'
		});
		// Tomcat manager should not be accessible — expect non-200 or empty
		assert.notEqual(res.status, 200, 'Tomcat manager should not return 200');
	});
});
