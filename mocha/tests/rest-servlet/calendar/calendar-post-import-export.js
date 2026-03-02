import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

const dataRoot = path.join(config.projectRoot, 'mocha/data/tests');

describe('Rest Servlet > Calendar > Calendar Post Import Export', function () {
	this.timeout(120 * 1000);
	let account1Email, account1Token;
	let account2Email, account2Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');

		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');

		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);
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
	it('Sanity | Post a basic calendar ICS to the REST servlet and then Get it to verify', async () => {
		const icsFilePath = path.join(dataRoot, 'bug-25845.ics');

		// Upload ICS
		const postRes = await rest.makeRestPostRequest(account1Token, {
			user: account1Email,
			folder: 'calendar',
			fmt: 'ics',
			filePath: icsFilePath
		});

		// Verify response
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// Verify appointment appears
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<GetApptSummariesRequest xmlns="urn:zimbraMail"
				s="1148754600000" e="1152383400000"/>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appts = searchRes.GetApptSummariesResponse?.appt;
		const apptArr = Array.isArray(appts) ? appts : (appts ? [appts] : []);
		const found = apptArr.find(a => a.name === 'Campus Picnic');

		// Verify response
		assert.exists(found, 'Appointment Campus Picnic should exist');
		const apptId = found.id;

		// Download via REST GET and verify
		const getRes = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: apptId,
			fmt: 'ics'
		});

		// Verify response
		assert.equal(getRes.status, 200, 'REST GET should return 200');
		assert.include(getRes.body, 'Campus Picnic', 'ICS should contain SUMMARY');
	});


	it('Sanity | Post a calendar ICS with Spanish characters', async () => {
		const icsFilePath = path.join(dataRoot, 'espanol.ics');

		// Upload ICS with Spanish characters
		const postRes = await rest.makeRestPostRequest(account2Token, {
			user: account2Email,
			folder: 'Calendar',
			fmt: 'ics',
			filePath: icsFilePath
		});

		// Verify response
		assert.equal(postRes.status, 200, 'REST POST should return 200');

		// Get calendar folder ID
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2Token
		);

		// Verify response
		assert.notExists(folderRes.Fault, 'Response should not be a Fault');

		// Search for the imported appointment
		const calFolder = folderRes.GetFolderResponse?.folder;
		const rootFolder = Array.isArray(calFolder) ? calFolder[0] : calFolder;

		// Find calendar folder
		const findCalFolder = (folder) => {
			if (folder.name === 'Calendar') return folder.id;
			if (folder.folder) {
				const folders = Array.isArray(folder.folder) ? folder.folder : [folder.folder];
				for (const f of folders) {
					const result = findCalFolder(f);
					if (result) return result;
				}
			}
			return null;
		};
		const calFolderId = findCalFolder(rootFolder);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="1245758400000" calExpandInstEnd="1246104000000"
				types="appointment">
				<query>inid:${calFolderId}</query>
			</SearchRequest>`, account2Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');

		const appt = searchRes.SearchResponse?.appt;
		const apptArr = Array.isArray(appt) ? appt : (appt ? [appt] : []);

		// Verify response
		assert.isAtLeast(apptArr.length, 1, 'Should find at least one imported appointment');

		// Verify Spanish characters
		const invId = apptArr[0].invId;

		// GetMsgRequest
		const msgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account2Token
		);

		// Verify response
		assert.notExists(msgRes.Fault, 'Response should not be a Fault');
		const comp = msgRes.GetMsgResponse?.m;
		const msgData = Array.isArray(comp) ? comp[0] : comp;
		const invComp = msgData?.inv?.[0]?.comp?.[0] || msgData?.inv?.comp;

		// Verify response
		assert.exists(invComp, 'Invitation component should exist');
	});
});
