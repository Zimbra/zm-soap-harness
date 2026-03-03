import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Zimlets > ACL Zimlets', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let cosName;
	let zimletName;
	let zimletPriority;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Get the first zimlet name and priority
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		const zimletsArr = Array.isArray(statusRes.GetZimletStatusResponse.zimlets)
			? statusRes.GetZimletStatusResponse.zimlets : [statusRes.GetZimletStatusResponse.zimlets];
		const zimletList = zimletsArr[0].zimlet
			? (Array.isArray(zimletsArr[0].zimlet) ? zimletsArr[0].zimlet : [zimletsArr[0].zimlet])
			: [];
		const enabledZimlet = zimletList.find(z => z && z.name && z.priority !== undefined);
		assert.exists(enabledZimlet, 'At least one zimlet with priority should exist');
		zimletName = enabledZimlet.name;
		zimletPriority = enabledZimlet.priority;
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
	it('Smoke | Grant access to new COS', async () => {
		// Create COS
		cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');

		// Grant zimlet access to COS
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${cosName}" acl="grant"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyZimletRequest grant should not fault');

		// Verify zimlet is enabled in new COS
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const targetCos = cosList.find(c => c.name === cosName);
		assert.exists(targetCos, 'COS should exist in response');
		const cosZimlets = targetCos.zimlet ? (Array.isArray(targetCos.zimlet) ? targetCos.zimlet : [targetCos.zimlet]) : [];
		const enabledZimlet = cosZimlets.find(z => z.status === 'enabled');
		assert.exists(enabledZimlet, 'Zimlet should be enabled in COS');
	});


	it('Smoke | Deny access to new COS', async () => {
		// Create COS
		const denyCosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${denyCosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');

		// Deny zimlet access to COS
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${denyCosName}" acl="deny"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyZimletRequest deny should not fault');

		// Verify zimlet is NOT listed in COS
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const targetCos = cosList.find(c => c.name === denyCosName);
		if (targetCos && targetCos.zimlet) {
			const cosZimlets = Array.isArray(targetCos.zimlet) ? targetCos.zimlet : [targetCos.zimlet];
			const deniedZimlet = cosZimlets.find(z => z.name === zimletName);
			assert.notExists(deniedZimlet, 'Denied zimlet should not be listed in COS');
		}

		// Verify default COS is not affected
		const defaultCos = cosList.find(c => c.name === 'default');
		assert.exists(defaultCos, 'Default COS should exist');
		const defaultZimlets = Array.isArray(defaultCos.zimlet) ? defaultCos.zimlet : [defaultCos.zimlet];
		const defaultEnabled = defaultZimlets.find(z => z.status === 'enabled' || z.status === 'disabled');
		assert.exists(defaultEnabled, 'Default COS zimlets should not be affected');
	});


	it('Sanity | Bogus access to new COS 1', async () => {
		// Create COS
		const bogusCosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${bogusCosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');

		// Deny zimlet first
		const denyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${bogusCosName}" acl="deny"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken
		);
		assert.notExists(denyRes.Fault, 'ModifyZimletRequest deny should not fault');

		// Try bogus ACL value — should fail with INVALID_REQUEST
		const bogusRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${bogusCosName}" acl="blah"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken, false
		);
		assert.isString(bogusRes.Fault.Detail.Error.Code, 'ModifyZimletRequest with bogus ACL should fault');
		assert.include(bogusRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Verify zimlet is still not listed (deny still in effect)
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const targetCos = cosList.find(c => c.name === bogusCosName);
		if (targetCos && targetCos.zimlet) {
			const cosZimlets = Array.isArray(targetCos.zimlet) ? targetCos.zimlet : [targetCos.zimlet];
			const found = cosZimlets.find(z => z.name === zimletName);
			assert.notExists(found, 'Zimlet should not be in COS after bogus ACL');
		}
	});


	it('Sanity | Bogus access to new COS 2', async () => {
		// Create COS
		const bogusCosName2 = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${bogusCosName2}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');

		// Grant zimlet first
		const grantRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${bogusCosName2}" acl="grant"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken
		);
		assert.notExists(grantRes.Fault, 'ModifyZimletRequest grant should not fault');

		// Try bogus ACL value — should fail with INVALID_REQUEST
		const bogusRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${bogusCosName2}" acl="blah"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken, false
		);
		assert.isString(bogusRes.Fault.Detail.Error.Code, 'ModifyZimletRequest with bogus ACL should fault');
		assert.include(bogusRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Verify zimlet is still listed (grant still in effect despite bogus attempt)
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const targetCos = cosList.find(c => c.name === bogusCosName2);
		assert.exists(targetCos, 'COS should exist');
		const cosZimlets = targetCos.zimlet ? (Array.isArray(targetCos.zimlet) ? targetCos.zimlet : [targetCos.zimlet]) : [];
		const found = cosZimlets.find(z => z.name === zimletName);
		assert.exists(found, 'Zimlet should still be in COS after bogus ACL attempt');
	});
});
