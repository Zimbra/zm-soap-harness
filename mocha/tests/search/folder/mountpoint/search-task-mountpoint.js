import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Search > Folder > Mountpoint > Task Mountpoint', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountAuthToken, accountAuthToken2;
	let accountEmail, accountEmail2;
	const mountpointName = `mp_${common.getUniqueString()}`;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1 (owner)
		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create account2 (grantee)
		accountEmail2 = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken2 = await soap.getAccountAuthToken(accountEmail2);

		// Create tasks in account1's Tasks folder (id=15)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="15">
					<inv>
						<comp name="task1_${common.getUniqueString()}" status="NEED" percentComplete="0"/>
					</inv>
					<su>task1_${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>task content 1</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m l="15">
					<inv>
						<comp name="task2_${common.getUniqueString()}" status="NEED" percentComplete="0"/>
					</inv>
					<su>task2_${common.getUniqueString()}</su>
					<mp ct="text/plain"><content>task content 2</content></mp>
				</m>
			</CreateTaskRequest>`, accountAuthToken
		);

		// Share account1's Tasks folder with account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="15" op="grant">
					<grant d="${accountEmail2}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, accountAuthToken
		);

		// Create mountpoint in account2
		await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountpointName}" view="task" rid="15" owner="${accountEmail}"/>
			</CreateMountpointRequest>`, accountAuthToken2
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify a mountpoint (containing tasks) can be searched', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');

		// SearchRequest with quotes
		const res3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>in:"${mountpointName}"</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res3.Fault, 'Response should not be a Fault');
		assert.exists(res3.SearchResponse, 'Response element should exist');

		// SearchRequest with parens
		const res4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task">
				<query>in:(${mountpointName})</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res4.Fault, 'Response should not be a Fault');
		assert.exists(res4.SearchResponse, 'Response element should exist');
	});


	it('Functional | Verify a mountpoint (containing tasks) can offset and limit', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task" offset="0"  limit="25">
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});


	it('Functional | Verify a mountpoint (containing tasks) can be sorted by due date (Bug: 17856)', async () => {
		// SearchRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="task" sortBy="taskDueDesc" >
				<query>in:${mountpointName}</query>
			</SearchRequest>`, accountAuthToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.exists(res2.SearchResponse, 'Response element should exist');
	});
});
