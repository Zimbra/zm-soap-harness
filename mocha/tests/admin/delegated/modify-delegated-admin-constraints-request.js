import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Delegated > Modify Delegated Admin Constraints Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let cosName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test COS
		cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name xmlns="">${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		assert.equal(cos.name, cosName, 'COS name should match');
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
	it('Smoke | Verify modified cos data by ModifyDelegatedAdminConstraintsRequest', async () => {
		// Set constraints on cos
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDelegatedAdminConstraintsRequest xmlns="urn:zimbraAdmin" type="cos" name="${cosName}">
				<a name="zimbraMailQuota">
					<constraint>
						<max>624288000</max>
						<min>30971520</min>
					</constraint>
				</a>
			</ModifyDelegatedAdminConstraintsRequest>`, adminAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyDelegatedAdminConstraintsRequest should not fault');
		assert.exists(modifyRes.ModifyDelegatedAdminConstraintsResponse,
			'ModifyDelegatedAdminConstraintsResponse should exist');

		// Verify constraints via Get
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDelegatedAdminConstraintsRequest xmlns="urn:zimbraAdmin" type="cos" name="${cosName}">
				<a name="zimbraMailQuota"/>
			</GetDelegatedAdminConstraintsRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetDelegatedAdminConstraintsRequest should not fault');
		const attrs = Array.isArray(getRes.GetDelegatedAdminConstraintsResponse.a)
			? getRes.GetDelegatedAdminConstraintsResponse.a
			: [getRes.GetDelegatedAdminConstraintsResponse.a];
		const quotaAttr = attrs.find(a => a.name === 'zimbraMailQuota');
		assert.exists(quotaAttr, 'zimbraMailQuota constraint should exist');
		const constraint = Array.isArray(quotaAttr.constraint)
			? quotaAttr.constraint[0] : quotaAttr.constraint;
		const minVal = Array.isArray(constraint.min)
			? constraint.min[0]._content : constraint.min;
		assert.equal(minVal, '30971520', 'min should be 30971520');
	});


	it('Sanity | Verify modified cos data of constraint with empty value by ModifyDelegatedAdminConstraintsRequest', async () => {
		// Set constraints with empty values
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDelegatedAdminConstraintsRequest xmlns="urn:zimbraAdmin" type="cos" name="${cosName}">
				<a name="zimbraMailQuota">
					<constraint>
						<max></max>
						<min></min>
					</constraint>
				</a>
			</ModifyDelegatedAdminConstraintsRequest>`, adminAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyDelegatedAdminConstraintsRequest should not fault');
		assert.exists(modifyRes.ModifyDelegatedAdminConstraintsResponse,
			'ModifyDelegatedAdminConstraintsResponse should exist');

		// Verify constraints cleared
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDelegatedAdminConstraintsRequest xmlns="urn:zimbraAdmin" type="cos" name="${cosName}">
				<a name="zimbraMailQuota"/>
			</GetDelegatedAdminConstraintsRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetDelegatedAdminConstraintsRequest should not fault');
	});


	it('Sanity | Verify modified config data by ModifyDelegatedAdminConstraintsRequest', async () => {
		// Set config constraints with values
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyDelegatedAdminConstraintsRequest xmlns="urn:zimbraAdmin" type="config">
				<a name="zimbraLastLogonTimestampFrequency">
					<constraint>
						<values>
							<v>10d</v>
						</values>
					</constraint>
				</a>
			</ModifyDelegatedAdminConstraintsRequest>`, adminAuthToken
		);
		assert.notExists(modifyRes.Fault, 'ModifyDelegatedAdminConstraintsRequest should not fault');
		assert.exists(modifyRes.ModifyDelegatedAdminConstraintsResponse,
			'ModifyDelegatedAdminConstraintsResponse should exist');

		// Verify config constraints
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetDelegatedAdminConstraintsRequest xmlns="urn:zimbraAdmin" type="config">
				<a name="zimbraLastLogonTimestampFrequency"></a>
			</GetDelegatedAdminConstraintsRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetDelegatedAdminConstraintsRequest should not fault');
		const attrs = Array.isArray(getRes.GetDelegatedAdminConstraintsResponse.a)
			? getRes.GetDelegatedAdminConstraintsResponse.a
			: [getRes.GetDelegatedAdminConstraintsResponse.a];
		const tsAttr = attrs.find(a => a.name === 'zimbraLastLogonTimestampFrequency');
		assert.exists(tsAttr, 'zimbraLastLogonTimestampFrequency constraint should exist');
		const constraint = Array.isArray(tsAttr.constraint)
			? tsAttr.constraint[0] : tsAttr.constraint;
		const valuesObj = Array.isArray(constraint.values)
			? constraint.values[0] : constraint.values;
		const vArr = Array.isArray(valuesObj.v) ? valuesObj.v : [valuesObj.v];
		const vContents = vArr.map(v => typeof v === 'object' ? v._content : v);
		assert.include(vContents, '10d', 'Constraint value should include 10d');
	});
});
