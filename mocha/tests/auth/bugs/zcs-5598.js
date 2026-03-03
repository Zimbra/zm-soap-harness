import { assert } from 'chai';
import config from '../../../conf/config.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Auth > Bugs > ZCS 5598', function () {
	this.timeout(60 * 1000);

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify WWW-Authenticate - BASIC realm Zimbra is not returned for non-existent account, existing account', async () => {
		// Verify with existing admin user + incorrect password
		// Send the message
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">admin</account>
				<password>test124</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes1.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(authRes1.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for existing user with incorrect password');

		// Verify with non-existent account + incorrect password
		// Send the message
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">account1.name.incorrect</account>
				<password>test124</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.isString(authRes2.Fault.Detail.Error.Code, 'Fault error Code should be a string');
		assert.include(authRes2.Fault.Detail.Error.Code, 'account.AUTH_FAILED',
			'Should return AUTH_FAILED for non-existent account');
	});
});
