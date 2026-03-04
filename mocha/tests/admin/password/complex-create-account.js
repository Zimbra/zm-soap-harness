import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Password > Complex Create Account', function () {
	this.timeout(60 * 1000);
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
	it('Sanity | Verify CreateAccountRequest sets the complex password settings 1', async () => {
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>ABCDEFabcdef123456,.?!;:</password>
				<a n="zimbraPasswordMinUpperCaseChars">4</a>
				<a n="zimbraPasswordMinLowerCaseChars">4</a>
				<a n="zimbraPasswordMinPunctuationChars">4</a>
				<a n="zimbraPasswordMinNumericChars">4</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
	});


	it('Functional | Verify CreateAccountRequest sets the complex password settings 2', async () => {
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>ABCDEFabcdef123456,.?!;:</password>
				<a n="zimbraPasswordMinUpperCaseChars">4</a>
				<a n="zimbraPasswordMinLowerCaseChars">4</a>
				<a n="zimbraPasswordMinPunctuationChars">4</a>
				<a n="zimbraPasswordMinNumericChars">4</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
	});


	it('Functional | Verify CreateAccountRequest throws an error if the password is not complex enough 1', async () => {
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>ABCabc123!@#</password>
				<a n="zimbraPasswordMinUpperCaseChars">4</a>
			</CreateAccountRequest>`, adminAuthToken, false
		);
		assert.isString(createRes.Fault.Detail.Error.Code, 'CreateAccountRequest should fault for insufficient uppercase');
		assert.include(createRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');
	});


	it('Functional | Verify CreateAccountRequest throws an error if the password is not complex enough 2', async () => {
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>ABCabc123!@#</password>
				<a n="zimbraPasswordMinLowerCaseChars">4</a>
			</CreateAccountRequest>`, adminAuthToken, false
		);
		assert.isString(createRes.Fault.Detail.Error.Code, 'CreateAccountRequest should fault for insufficient lowercase');
		assert.include(createRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');
	});


	it('Functional | Verify CreateAccountRequest throws an error if the password is not complex enough 3', async () => {
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>ABCabc123!@#</password>
				<a n="zimbraPasswordMinPunctuationChars">4</a>
			</CreateAccountRequest>`, adminAuthToken, false
		);
		assert.isString(createRes.Fault.Detail.Error.Code, 'CreateAccountRequest should fault for insufficient punctuation');
		assert.include(createRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');
	});


	it('Functional | Verify CreateAccountRequest throws an error if the password is not complex enough 4', async () => {
		const accountEmail = `complex.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>ABCabc123!@#</password>
				<a n="zimbraPasswordMinNumericChars">4</a>
			</CreateAccountRequest>`, adminAuthToken, false
		);
		assert.isString(createRes.Fault.Detail.Error.Code, 'CreateAccountRequest should fault for insufficient numeric');
		assert.include(createRes.Fault.Detail.Error.Code, 'account.INVALID_PASSWORD');
	});
});
