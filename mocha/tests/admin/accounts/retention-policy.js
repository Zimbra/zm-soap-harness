import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Retention Policy', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Create system retention policy with lifetime in seconds', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(response.CreateSystemRetentionPolicyResponse);
	});


	it('Smoke | Create system retention policy with lifetime in minutes (purge)', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<purge>
					<policy name="${policyName}" lifetime="1m" xmlns="urn:zimbraMail"/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(response.CreateSystemRetentionPolicyResponse);
	});


	it('Smoke | Create system retention policy with lifetime in days', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<purge>
					<policy name="${policyName}" lifetime="1d" xmlns="urn:zimbraMail"/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(response.CreateSystemRetentionPolicyResponse);
	});


	it('Smoke | Create system retention policy with lifetime in hours', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<purge>
					<policy name="${policyName}" lifetime="2h" xmlns="urn:zimbraMail"/>
				</purge>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(response.CreateSystemRetentionPolicyResponse);
	});


	it('Regression | Create system retention policy with invalid lifetime values', async () => {
		const invalidValues = ['29h67m', '---2h', '1d25h', '-2h', 'asdash', '1209d25m', '-24d'];
		for (const val of invalidValues) {
			const policyName = `policy${common.getUniqueString()}`;
			const response = await soap.makeSOAPEnvelopeAdmin(
				`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
					<purge>
						<policy name="${policyName}" lifetime="${val}" xmlns="urn:zimbraMail"/>
					</purge>
				</CreateSystemRetentionPolicyRequest>`, adminAuthToken
			);
			assert.exists(response.Fault, `Should fault for invalid lifetime "${val}"`);
		}
	});


	it('Smoke | Modify system retention policy - change lifetime', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const policyId = createRes.CreateSystemRetentionPolicyResponse.policy[0].id;

		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifySystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<policy id="${policyId}" lifetime="5d" xmlns="urn:zimbraMail"/>
			</ModifySystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(modRes.ModifySystemRetentionPolicyResponse);
		assert.equal(modRes.ModifySystemRetentionPolicyResponse.policy[0].lifetime, '5d');
	});


	it('Smoke | Modify system retention policy - change name', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const policyId = createRes.CreateSystemRetentionPolicyResponse.policy[0].id;
		const newName = `new${policyName}`;

		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifySystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<policy id="${policyId}" name="${newName}" xmlns="urn:zimbraMail"/>
			</ModifySystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(modRes.ModifySystemRetentionPolicyResponse);
		assert.equal(modRes.ModifySystemRetentionPolicyResponse.policy[0].name, newName);
	});


	it('Smoke | Get system retention policy', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const policyId = createRes.CreateSystemRetentionPolicyResponse.policy[0].id;

		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
			</GetSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(getRes.GetSystemRetentionPolicyResponse);
	});


	it('Smoke | Delete system retention policy', async () => {
		const policyName = `policy${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<keep>
					<policy name="${policyName}" lifetime="2s" xmlns="urn:zimbraMail"/>
				</keep>
			</CreateSystemRetentionPolicyRequest>`, adminAuthToken
		);
		const policyId = createRes.CreateSystemRetentionPolicyResponse.policy[0].id;

		const delRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
				<policy id="${policyId}" xmlns="urn:zimbraMail"/>
			</DeleteSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(delRes.DeleteSystemRetentionPolicyResponse);

		// Verify deleted
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetSystemRetentionPolicyRequest xmlns="urn:zimbraAdmin">
			</GetSystemRetentionPolicyRequest>`, adminAuthToken
		);
		assert.exists(getRes.GetSystemRetentionPolicyResponse);
	});

});
