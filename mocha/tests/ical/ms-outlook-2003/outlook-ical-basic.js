import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('ICAL > Ms Outlook 2003 > Outlook ICAL Basic', function () {
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
	it('Smoke | Verify the basic iCal format invitation with basic information', async () => {
		const accountEmail = `ical.ob1.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject1';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-simple.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format invitation without subject from Outlook2003', async () => {
		const accountEmail = `ical.ob2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-without-sub.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>To:${accountEmail}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

		// GetFolderRequest
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');

		const searchStart = '1121336254170';
		const searchEnd = '1138616254170';

		// SearchRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${searchStart}" calExpandInstEnd="${searchEnd}">
				<query>inid:10</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest for appointment should not fault');
	});


	it('Functional | Verify the basic iCal format invitation without location from Outlook2003', async () => {
		const accountEmail = `ical.ob3.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject3';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-without-loc.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format invitation with two invitees from Outlook2003', async () => {
		const accountEmail = `ical.ob4.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject4';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-2invitees.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format invitation with One hour meeting from Outlook2003', async () => {
		const accountEmail = `ical.ob5.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject5';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-1hmeeting.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format invitation for all day meeting from Outlook2003', async () => {
		const accountEmail = `ical.ob6.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject6';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-allday.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format invitation without enabling the reminder from Outlook2003', async () => {
		const accountEmail = `ical.ob7.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject7';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-without-reminder.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment with status of an appointment busy (Show Time as busy )', async () => {
		const accountEmail = `ical.ob8.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject8';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-with-bussy.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment with status of an appointment = free/tentative/out of office (\'Show Time as\' = other than busy )', async () => {
		const accountEmail = `ical.ob9.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject9';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-otherthan-bussy.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment without alarm enable', async () => {
		const accountEmail = `ical.ob10.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject10';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-without-alarm.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment which send as a private from Outlook2003', async () => {
		const accountEmail = `ical.ob11.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject11';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-private.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment which send as a public from Outlook2003', async () => {
		const accountEmail = `ical.ob12.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject12';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-public.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment which is sent with low priority from Outlook2003', async () => {
		const accountEmail = `ical.ob13.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject13';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-low.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment which is sent with high priority from Outlook2003', async () => {
		const accountEmail = `ical.ob14.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject14';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-high.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment which is sent as a meeting request from Outlook2003', async () => {
		const accountEmail = `ical.ob15.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject15';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-meeting.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});


	it('Functional | Verify the basic iCal format for an appointment which is sent from different timezone of Outlook2003', async () => {
		const accountEmail = `ical.ob16.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(adminAuthToken, accountEmail, accountEmail);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${accountEmail}</account></GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, config.accountPassword);

		const mailSubject = 'outlook_ical_subject16';
		const filePath = path.join(config.projectRoot, 'mocha/data/ical/outlook-ical-different-timezone.txt');
		await soap.injectMime(accountAuthToken, filePath);

		// SearchRequest
		let res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message,appointment">
				<query>subject:${mailSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SearchRequest should not fault');

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
	});
});
