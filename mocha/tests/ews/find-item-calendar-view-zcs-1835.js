import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Find Item Calendar View ZCS 1835', function () {
	this.timeout(180 * 1000);
	let account1Email, account1Password, account2Email;
	let apptSubject, apptSubject1, apptSubject2, apptSubject3, apptSubject4, apptSubject5;
	let startTime, endTime, startTime2, endTime2;

	function toXmlTime(date) {
		return date.toISOString();
	}

	function toGmtTime(date) {
		return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	}

	function toGmtDateOnly(date) {
		return date.toISOString().split('T')[0].replace(/-/g, '');
	}

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;

		account1Email = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		account2Email = `ewstest${common.getUniqueString()}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, account1Password);

		// Generate time values
		const now = new Date();

		// CalendarView date ranges
		const startTimeDate = new Date(now);
		startTimeDate.setDate(startTimeDate.getDate() - 10);
		startTime = toXmlTime(startTimeDate);

		const endTimeDate = new Date(now);
		endTimeDate.setDate(endTimeDate.getDate() + 10);
		endTime = toXmlTime(endTimeDate);

		const startTime2Date = new Date(now);
		startTime2Date.setHours(startTime2Date.getHours() - 2);
		startTime2 = toXmlTime(startTime2Date);

		const endTime2Date = new Date(now);
		endTime2Date.setDate(endTime2Date.getDate() + 3);
		endTime2 = toXmlTime(endTime2Date);

		// Appointment subjects
		apptSubject = `subject-${common.getUniqueString()}`;
		apptSubject1 = `subject1-${common.getUniqueString()}`;
		apptSubject2 = `subject2-${common.getUniqueString()}`;
		apptSubject3 = `subject3-${common.getUniqueString()}`;
		apptSubject4 = `subject4-${common.getUniqueString()}`;
		apptSubject5 = `subject5-${common.getUniqueString()}`;
		const apptContent = 'Appointment test content';

		// Appt 1: +30m to +1h
		const appt1S = new Date(now);
		appt1S.setMinutes(appt1S.getMinutes() + 30);
		const appt1E = new Date(now);
		appt1E.setHours(appt1E.getHours() + 1);

		// Appt 2: +1d+30m to +1d+1h
		const appt2S = new Date(now);
		appt2S.setDate(appt2S.getDate() + 1);
		appt2S.setMinutes(appt2S.getMinutes() + 30);
		const appt2E = new Date(now);
		appt2E.setDate(appt2E.getDate() + 1);
		appt2E.setHours(appt2E.getHours() + 1);

		// Appt 3: +2d+30m to +2d+1h
		const appt3S = new Date(now);
		appt3S.setDate(appt3S.getDate() + 2);
		appt3S.setMinutes(appt3S.getMinutes() + 30);
		const appt3E = new Date(now);
		appt3E.setDate(appt3E.getDate() + 2);
		appt3E.setHours(appt3E.getHours() + 1);

		// Appt 4: +3d+30m to +3d+1h
		const appt4S = new Date(now);
		appt4S.setDate(appt4S.getDate() + 3);
		appt4S.setMinutes(appt4S.getMinutes() + 30);
		const appt4E = new Date(now);
		appt4E.setDate(appt4E.getDate() + 3);
		appt4E.setHours(appt4E.getHours() + 1);

		// Appt 5: +4d+30m to +4d+1h
		const appt5S = new Date(now);
		appt5S.setDate(appt5S.getDate() + 4);
		appt5S.setMinutes(appt5S.getMinutes() + 30);
		const appt5E = new Date(now);
		appt5E.setDate(appt5E.getDate() + 4);
		appt5E.setHours(appt5E.getHours() + 1);

		// All-day 1: +5d
		const apptAD1S = new Date(now);
		apptAD1S.setDate(apptAD1S.getDate() + 5);

		// All-day 2: +6d
		const apptAD2S = new Date(now);
		apptAD2S.setDate(apptAD2S.getDate() + 6);

		// Recurring: +7d+30m to +7d+1h
		const apptRS = new Date(now);
		apptRS.setDate(apptRS.getDate() + 7);
		apptRS.setMinutes(apptRS.getMinutes() + 30);
		const apptRE = new Date(now);
		apptRE.setDate(apptRE.getDate() + 7);
		apptRE.setHours(apptRE.getHours() + 1);

		// Create appointment 1
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtTime(appt1S)}" />
						<e d="${toGmtTime(appt1E)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Create appointment 2
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject1}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtTime(appt2S)}" />
						<e d="${toGmtTime(appt2E)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject1}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Create appointment 3
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject2}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtTime(appt3S)}" />
						<e d="${toGmtTime(appt3E)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject2}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Create appointment 4
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject3}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtTime(appt4S)}" />
						<e d="${toGmtTime(appt4E)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject3}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Create appointment 5
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject4}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtTime(appt5S)}" />
						<e d="${toGmtTime(appt5E)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject4}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Create all-day appointment 1
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="1"
						name="AD 1">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtDateOnly(apptAD1S)}" />
						<e d="${toGmtDateOnly(apptAD1S)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>AD 1</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		// Create all-day appointment 2
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="1"
						name="AD 2">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtDateOnly(apptAD2S)}" />
						<e d="${toGmtDateOnly(apptAD2S)}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>AD 2</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		await soap.waitFor(10000);

		// Create recurring appointment (+7d, daily for 10 days)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject5}">
						<at role="OPT" ptst="NE" rsvp="1" a="${account2Email}" />
						<s d="${toGmtTime(apptRS)}" />
						<e d="${toGmtTime(apptRE)}" />
						<or a="${account1Email}" />
						<recur>
							<add>
								<rule freq="DAI">
									<interval ival="1" />
									<count num="10" />
								</rule>
							</add>
						</recur>
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject5}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);

		await soap.waitFor(30000);
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
	it('Sanity | FindItem request for calendar folder', async () => {
		await soap.waitFor(20000);

		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
				</ItemShape>
				<CalendarView MaxEntriesReturned="10"
					EndDate="${endTime}" StartDate="${startTime}" />
				<ParentFolderIds>
					<t:FolderId Id="10" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const findItemBody = ews.getBody(findItemRes);
		assert.exists(findItemBody.FindItemResponse, 'FindItemResponse should exist');
		const findItemMsg = findItemBody.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(findItemMsg) ? findItemMsg[0] : findItemMsg;
		const items = itemMsg.RootFolder.Items.CalendarItem;
		const calItems = Array.isArray(items) ? items : [items];

		// Verify AD 1 is in the results
		const hasAD1 = calItems.some(item => item.Subject === 'AD 1');
		assert.isTrue(hasAD1, 'AD 1 should be in the results');
	});


	it('Sanity | FindItem request for Folder ID for calendar', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
				</ItemShape>
				<CalendarView MaxEntriesReturned="7"
					EndDate="${endTime}" StartDate="${startTime}" />
				<ParentFolderIds>
					<t:FolderId Id="10" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const findItemBody = ews.getBody(findItemRes);
		assert.exists(findItemBody.FindItemResponse, 'FindItemResponse should exist');
		const findItemMsg = findItemBody.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(findItemMsg) ? findItemMsg[0] : findItemMsg;
		const items = itemMsg.RootFolder.Items.CalendarItem;
		const calItems = Array.isArray(items) ? items : [items];

		// Verify first item is apptSubject
		assert.equal(calItems[0].Subject, apptSubject, 'First item should match apptSubject');
		// Verify 7th item is AD 2
		assert.equal(calItems[6].Subject, 'AD 2', 'Seventh item should be AD 2');
	});


	it('Sanity | FindItem request with Folder ID for calendar', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
				</ItemShape>
				<CalendarView EndDate="${endTime}" StartDate="${startTime}" />
				<ParentFolderIds>
					<t:FolderId Id="10" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const findItemBody = ews.getBody(findItemRes);
		assert.exists(findItemBody.FindItemResponse, 'FindItemResponse should exist');
		const findItemMsg = findItemBody.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(findItemMsg) ? findItemMsg[0] : findItemMsg;
		assert.equal(
			itemMsg.RootFolder.$.TotalItemsInView, '10',
			'TotalItemsInView should be 10'
		);
	});


	it('Sanity | FindItem request for Shallow traversal with Folder ID for calendar', async () => {
		const findItemRes = await ews.makeEWSRequest(
			`<FindItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				Traversal="Shallow">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
				</ItemShape>
				<CalendarView MaxEntriesReturned="7"
					EndDate="${endTime2}" StartDate="${startTime2}" />
				<ParentFolderIds>
					<t:FolderId Id="10" />
				</ParentFolderIds>
			</FindItem>`,
			account1Email, account1Password
		);
		const findItemBody = ews.getBody(findItemRes);
		assert.exists(findItemBody.FindItemResponse, 'FindItemResponse should exist');
		const findItemMsg = findItemBody.FindItemResponse.ResponseMessages.FindItemResponseMessage;
		const itemMsg = Array.isArray(findItemMsg) ? findItemMsg[0] : findItemMsg;
		const items = itemMsg.RootFolder.Items.CalendarItem;
		const calItems = Array.isArray(items) ? items : [items];

		// Verify subjects of first 3 items within the narrower date range
		assert.equal(calItems[0].Subject, apptSubject, 'First item should match apptSubject');
		assert.equal(calItems[1].Subject, apptSubject1, 'Second item should match apptSubject1');
		assert.equal(calItems[2].Subject, apptSubject2, 'Third item should match apptSubject2');
		assert.equal(
			itemMsg.RootFolder.$.TotalItemsInView, '3',
			'TotalItemsInView should be 3'
		);
	});
});
