import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > FreeBusy > GetWorkingHoursRequestRequest', function () {
    this.timeout(120 * 1000);
    let adminAuthToken;
    const testDomain = config.testDomain;
    const pad = (n) => String(n).padStart(2, '0');

    function futureTime(offsetMs) {
        const d = new Date(Date.now() + offsetMs);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    }

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

    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    let acct1, acct2;

    before(async function () {
        const e1 = `wh1${common.getUniqueString()}@${testDomain}`;
        const e2 = `wh2${common.getUniqueString()}@${testDomain}`;
        const r1 = await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${e1}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${e2}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
        const id1 = r1.CreateAccountResponse.account[0].id;
        acct1 = {
            email: e1, id: id1,
            token: await soap.getAccountAuthToken(e1)
        };
        acct2 = {
            email: e2,
            token: await soap.getAccountAuthToken(e2)
        };
    });


    it('Smoke | Retrieve working hours within given time range', async () => {
        const now = Date.now();
        const end = now + 36000000;
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="${now}" e="${end}"
				id="${acct1.id}"/>`, acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetWorkingHoursRequestResponse.usr,
            'Working hours data should exist'
        );
    });


    it('Sanity | Blank s RANGESTART returns error', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="" e="${now + 36000000}"
				id="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for blank s');
    });


    it('Sanity | Blank e RANGEEND returns error', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="${now}" e=""
				id="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for blank e');
    });


    it('Sanity | Negative s RANGESTART returns error', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="-111111" e="${now + 36000000}"
				id="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for negative s');
    });


    it('Sanity | Negative e RANGEEND returns error', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="${now}" e="-11111"
				id="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for negative e');
    });


    it('Sanity | Alphabetic s and e returns error', async () => {
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="aaaa" e="bbbb"
				id="${acct1.id}"/>`, acct1.token
        );
        assert.exists(res.Fault, 'Should fault for text s/e');
    });


    it('Sanity | Multiple users working hours', async () => {
        const now = Date.now();
        const res = await soap.makeSOAPEnvelopeAccount(
            `<GetWorkingHoursRequestRequest xmlns="urn:zimbraMail"
				s="${now - 86400000}" e="${now + 86400000}"
				name="${acct1.email},${acct2.email}"/>`,
            acct1.token
        );
        assert.notExists(res.Fault, 'Should not fault');
        assert.exists(
            res.GetWorkingHoursRequestResponse.usr,
            'Working hours should exist'
        );
    });
});
