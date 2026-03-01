import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > MS Outlook 2003 > Outlook Ical Recur', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

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
	it('Smoke | Verify the iCal format invitation for an appointment of half an hour repeating daily and never ending.', async () => {
		const accountEmail = `ical.or1.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur1';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur1.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for a daily appointment every 3 days ending after 10 occurrences', async () => {
		const accountEmail = `ical.or2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur2';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur2.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for an appointment repeating daily every 5 days ending after 1 month', async () => {
		const accountEmail = `ical.or3.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur3';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur3.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for an daily appointment every weekday never ending', async () => {
		const accountEmail = `ical.or4.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur4';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur4.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for an appointment every weekday ending after 10 occurrences', async () => {
		const accountEmail = `ical.or5.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur5';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur5.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for an appointment every weekday ending after 1 month', async () => {
		const accountEmail = `ical.or6.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur6';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur6.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for an repeating every 1 week on Thursday never ending', async () => {
		const accountEmail = `ical.or7.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur7';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur7.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for weekly appointment repeating every 2 weeks on Thursday ending after 10 occurrences', async () => {
		const accountEmail = `ical.or8.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur8';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur8.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for weekly appointment repeating every 2 weeks on Thursday ending by 20th january 2006', async () => {
		const accountEmail = `ical.or9.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur9';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur9.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for monthly appointment repeating on every 15th day of a month never ending', async () => {
		const accountEmail = `ical.or10.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur10';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur10.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for monthly appointment repeating on every 15th day of a month ending after 15 occurrences .', async () => {
		const accountEmail = `ical.or11.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur11';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur11.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for monthly appointment repeating on every 15ht day of a month ending by 20th nov 2005(after 1 month)', async () => {
		const accountEmail = `ical.or12.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur12';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur12.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for monthly appointment repeating on the second Monday of every 1 months never ending', async () => {
		const accountEmail = `ical.or13.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur13';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur13.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for monthly appointment repeating on the second monday of every 1 months ending after 5 occurrences', async () => {
		const accountEmail = `ical.or14.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur14';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur14.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for monthly appointment repeating on the second Monday of every 1 month ending by 29th january 2007', async () => {
		const accountEmail = `ical.or15.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur15';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur15.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for yearly appointment repeating on the fourth Wednesday of january ending by 29th jan 2015.', async () => {
		const accountEmail = `ical.or16.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur16';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur16.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});


	it('Functional | Verify the ical format invitation for daily appointment every 1 day starting on 20th november 2005 and ending on 20th december 2005.', async () => {
		const accountEmail = `ical.or17.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_recur17';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-recur17.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse should exist');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
		assert.exists(res.SearchResponse, 'SearchResponse for appointment should have results');
	});
});
