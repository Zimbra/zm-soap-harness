import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Retention Policy', function () {
	let adminAuthToken;

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
	it('Sanity | Create System retention policy lifetime in seconds', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSystemRetentionPolicyResponse,
			'CreateSystemRetentionPolicyResponse should exist');
	});


	it('Sanity | Create System retention policy lifetime in minutes', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<purge>
					<policy name="${policyName}" lifetime="1m" xmlns="urn:zimbraMail"/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSystemRetentionPolicyResponse,
			'CreateSystemRetentionPolicyResponse should exist');
	});


	it('Sanity | Create System retention policy lifetime in days', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<purge>
					<policy name="${policyName}" lifetime="1d" xmlns="urn:zimbraMail"/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSystemRetentionPolicyResponse,
			'CreateSystemRetentionPolicyResponse should exist');
	});


	it('Sanity | Create System retention policy lifetime in hours', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<purge>
					<policy name="${policyName}" lifetime="2h" xmlns="urn:zimbraMail"/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		assert.exists(response.CreateSystemRetentionPolicyResponse,
			'CreateSystemRetentionPolicyResponse should exist');
	});


	it('Regression | Create System retention policy lifetime invalid values', async () => {
		const invalidValues = ['29h67m', '---2h', '1d25h', '-2h', 'asdash', '1209d25m', '-24d'];
		for (const val of invalidValues) {
			const policyName = `policy${common.getUniqueString()}`;

			// CreateSystemRetentionPolicyRequest
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
					<purge>
						<policy name="${policyName}" lifetime="${val}" xmlns="urn:zimbraMail"/>
					</purge>
				</CreateSystemRetentionPolicyRequest>`, adminAuthToken, false
			);

			// Verify response
			assert.exists(response.Fault, `Should fault for invalid lifetime "${val}"`);
		}
	});


	it('Sanity | Modify System retention policies with change lifetime', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const keepPolicy = createRes.CreateSystemRetentionPolicyResponse?.policy;
		const policyId = Array.isArray(keepPolicy) ? keepPolicy[0].id : keepPolicy?.id;

		// ModifySystemRetentionPolicyRequest
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifySystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<policy id="${policyId}" name="${policyName}" lifetime="5d" type="user" xmlns="urn:zimbraMail"/>
			</ModifySystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifySystemRetentionPolicyResponse,
			'ModifySystemRetentionPolicyResponse should exist');

		const modPolicy = modRes.ModifySystemRetentionPolicyResponse?.policy;
		assert.equal(Array.isArray(modPolicy) ? modPolicy[0].lifetime : modPolicy?.lifetime, '5d');
	});


	it('Sanity | Modify System retention policies change name', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const keepPolicy = createRes.CreateSystemRetentionPolicyResponse?.policy;
		const policyId = Array.isArray(keepPolicy) ? keepPolicy[0].id : keepPolicy?.id;
		const newName = `new${policyName}`;

		// ModifySystemRetentionPolicyRequest
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifySystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<policy id="${policyId}" name="${newName}" xmlns="urn:zimbraMail"/>
			</ModifySystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifySystemRetentionPolicyResponse,
			'ModifySystemRetentionPolicyResponse should exist');

		const modPolicy = modRes.ModifySystemRetentionPolicyResponse?.policy;
		assert.equal(Array.isArray(modPolicy) ? modPolicy[0].name : modPolicy?.name, newName);
	});


	it('Sanity | Get System retention policy', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// GetSystemRetentionPolicyRequest
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
			</GetSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetSystemRetentionPolicyResponse,
			'GetSystemRetentionPolicyResponse should exist');
	});


	it('Sanity | Delete System retention policy', async () => {
		const policyName = `policy${common.getUniqueString()}`;

		// CreateSystemRetentionPolicyRequest
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const keepPolicy = createRes.CreateSystemRetentionPolicyResponse?.policy;
		const policyId = Array.isArray(keepPolicy) ? keepPolicy[0].id : keepPolicy?.id;

		// DeleteSystemRetentionPolicyRequest
		const delRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<policy id="${policyId}" xmlns="urn:zimbraMail"/>
			</DeleteSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(delRes.Fault, 'Response should not be a Fault');
		assert.exists(delRes.DeleteSystemRetentionPolicyResponse,
			'DeleteSystemRetentionPolicyResponse should exist');

		// Verify deleted
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
			</GetSystemRetentionPolicyRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetSystemRetentionPolicyResponse,
			'GetSystemRetentionPolicyResponse should exist');
	});
});
