import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('iCal > MS Outlook 2003 > Recurrence', function () {
    this.timeout(30 * 1000);

    before(async function () {
        await main.before(this.ctx);
    });

    // Applicable zimbra versions
    if (config.serial === true ||
        !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it.skip('Smoke | Verify the iCal format invitation for an appointment of half an hour repeating daily' +
        ' and never ending [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur01
        });


    it.skip('Functional | Verify the ical format invitation for a daily appointment every 3 days ending' +
        ' after 10 occurrences [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur02
        });


    it.skip('Functional | Verify the ical format invitation for an appointment repeating daily every 5 days' +
        ' ending after 1 month [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur03
        });


    it.skip('Functional | Verify the ical format invitation for an daily appointment every weekday' +
        ' never ending [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur04
        });


    it.skip('Functional | Verify the ical format invitation for an appointment every weekday ending' +
        ' after 10 occurrences [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur05
        });


    it.skip('Functional | Verify the ical format invitation for an appointment every weekday ending' +
        ' after 1 month [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur06
        });


    it.skip('Functional | Verify the ical format invitation for an repeating every 1 week on Thursday' +
        ' never ending [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur07
        });


    it.skip('Functional | Verify the ical format invitation for weekly appointment repeating every 2 weeks' +
        ' on Thursday ending after 10 occurrences [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur08
        });


    it.skip('Functional | Verify the ical format invitation for weekly appointment repeating every 2 weeks' +
        ' on Thursday ending by 20th january 2006 [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur09
        });


    it.skip('Functional | Verify the ical format invitation for monthly appointment repeating on every 15th day' +
        ' of a month never ending [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur10
        });


    it.skip('Functional | Verify the ical format invitation for monthly appointment repeating on every 15th day' +
        ' of a month ending after 15 occurrences [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur11
        });


    it.skip('Functional | Verify the ical format invitation for monthly appointment repeating on every 15ht day' +
        ' of a month ending by 20th nov 2005 [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur12
        });


    it.skip('Functional | Verify the ical format invitation for monthly appointment repeating on the second Monday' +
        ' of every 1 months never ending [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur13
        });


    it.skip('Functional | Verify the ical format invitation for monthly appointment repeating on the second monday' +
        ' of every 1 months ending after 5 occurrences [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur14
        });


    it.skip('Functional | Verify the ical format invitation for monthly appointment repeating on the second Monday' +
        ' of every 1 month ending by 29th january 2007 [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur15
        });


    it.skip('Functional | Verify the ical format invitation for yearly appointment repeating on the fourth Wednesday' +
        ' of january ending by 29th jan 2015 [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur16
        });


    it.skip('Functional | Verify the ical format invitation for daily appointment every 1 day starting on' +
        ' 20th november 2005 and ending on 20th december 2005 [LMTP inject not supported in JS framework]', async () => {
            // outlook_ical_recur17
        });
});
