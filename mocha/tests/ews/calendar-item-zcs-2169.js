import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > CalendarItem ZCS-2169', function () {
    this.timeout(120 * 1000);
    let adminAuthToken, account1Email, account1Password;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();
        account1Password = 'test123';

        const accountName = `ewstest${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );
        account1Email = accountName;
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Creating recurring appointments from outlook 2016 should show all instances including last instance in ZWC', async () => {
        const messageSubject = `subject1${common.getUniqueString()}`;

        // EWS: CreateItem — recurring appointment with EndDateRecurrence
        const createRes = await ews.makeEWSRequest(
            `<CreateItem
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${messageSubject}</t:Subject>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="CalendarTimeZone"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="String" />
							<t:Value>Asia/Kolkata</t:Value>
						</t:ExtendedProperty>
						<t:UID>147EA834-D714-429E-94D7-80A1A975F61E</t:UID>
						<t:Start>2017-09-03T09:00:00+05:30</t:Start>
						<t:End>2017-09-03T10:00:00+05:30</t:End>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:Recurrence>
							<t:DailyRecurrence>
								<t:Interval>1</t:Interval>
							</t:DailyRecurrence>
							<t:EndDateRecurrence>
								<t:StartDate>2017-09-03</t:StartDate>
								<t:EndDate>2017-09-06</t:EndDate>
							</t:EndDateRecurrence>
						</t:Recurrence>
						<t:MeetingTimeZone TimeZoneName="India Standard Time" />
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
            account1Email, account1Password
        );
        const createBody = ews.getBody(createRes);
        const createMsg = createBody.CreateItemResponse
            .ResponseMessages.CreateItemResponseMessage;
        const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
        assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');

        // ZWC: Verify the appointment via SearchRequest
        await soap.waitFor(5000);
        const accountAuthToken = await soap.getAccountAuthToken(account1Email, account1Password);
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
        const appt = searchRes.SearchResponse?.appt;
        assert.exists(appt, 'Appointment should exist in search results');
        const apptItem = Array.isArray(appt) ? appt[0] : appt;
        const invId = apptItem.invId;

        // ZWC: GetMsgRequest to verify until date
        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, accountAuthToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
        const msg = getMsgRes.GetMsgResponse?.m;
        assert.exists(msg, 'Message should exist');
        const msgItem = Array.isArray(msg) ? msg[0] : msg;
        const inv = Array.isArray(msgItem?.inv) ? msgItem.inv[0] : msgItem?.inv;
        const comp = Array.isArray(inv?.comp) ? inv.comp[0] : inv?.comp;
        const recur = Array.isArray(comp?.recur) ? comp.recur[0] : comp?.recur;
        const add = Array.isArray(recur?.add) ? recur.add[0] : recur?.add;
        const rule = Array.isArray(add?.rule) ? add.rule[0] : add?.rule;
        const until = Array.isArray(rule?.until) ? rule.until[0] : rule?.until;
        assert.exists(until, 'Recurrence until element should exist');
        assert.equal(until.d, '20170906T182959Z', 'Until date should match expected value');
    });
});
