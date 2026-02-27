import soap from './mocha/framework/backend/soap-client.js';
import { main } from './mocha/pages/main.js';
import common from './mocha/framework/core/common.js';
import config from './mocha/conf/config.js';

await main.before({});
const adminAuthToken = await soap.getAdminAuthToken();

const a1Name = `test.${common.getUniqueString()}@${config.testDomain}`;
const cr1 = await soap.makeSOAPEnvelopeAdmin(
    `<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${a1Name}</name><password>${soap.accountPassword}</password></CreateAccountRequest>`, adminAuthToken
);
const a1Token = await soap.getAccountAuthToken(a1Name);

const uid = common.getUniqueString();
const subject = `test${common.getUniqueString()}`;

const setRes = await soap.makeSOAPEnvelopeAccount(
    `<SetAppointmentRequest xmlns="urn:zimbraMail">
		<default needsReply="0" ptst="AC"><m>
			<inv uid="${uid}" seq="1" method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${subject}">
				<s d="20100301T080000" tz="Asia/Kolkata"/><e d="20100301T090000" tz="Asia/Kolkata"/>
				<or a="${a1Name}"/><recur><add><rule freq="DAI"><interval ival="1"/><count num="5"/></rule></add></recur>
			</inv>
			<mp content-type="text/plain"><content>test</content></mp><su>${subject}</su>
		</m></default>
	</SetAppointmentRequest>`, a1Token
);
console.log('Create OK:', !!setRes.SetAppointmentResponse);
const apptId = setRes.SetAppointmentResponse.apptId;

const setRes2 = await soap.makeSOAPEnvelopeAccount(
    `<SetAppointmentRequest xmlns="urn:zimbraMail">
		<default needsReply="0" ptst="AC"><m>
			<inv uid="${uid}" seq="2" method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${subject}">
				<s d="20100301T120000" tz="Asia/Kolkata"/><e d="20100301T130000" tz="Asia/Kolkata"/>
				<or a="${a1Name}"/><recur><add><rule freq="DAI"><interval ival="1"/><count num="5"/></rule></add></recur>
			</inv>
			<mp content-type="text/plain"><content>test</content></mp><su>${subject}</su>
		</m></default>
	</SetAppointmentRequest>`, a1Token
);
console.log('Modify OK:', !!setRes2.SetAppointmentResponse);

const getRes = await soap.makeSOAPEnvelopeAccount(
    `<GetAppointmentRequest xmlns="urn:zimbraMail" id="${apptId}"/>`, a1Token
);
const apptData = getRes.GetAppointmentResponse.appt[0];
const inv = Array.isArray(apptData.inv) ? apptData.inv[0] : apptData.inv;
console.log('inv.id:', inv.id, 'inv.compNum:', inv.compNum, 'apptId:', apptId);

// Try cancel with inv.id
const c1 = await soap.makeSOAPEnvelopeAccount(
    `<CancelAppointmentRequest xmlns="urn:zimbraMail" id="${inv.id}" comp="${inv.compNum}">
		<m><su>Cancelled</su><mp ct="text/plain"><content>x</content></mp></m>
	</CancelAppointmentRequest>`, a1Token
);
console.log('Cancel inv.id:', JSON.stringify(c1.CancelAppointmentResponse || c1.Fault));

if (c1.Fault) {
    // Retry with apptId
    const c2 = await soap.makeSOAPEnvelopeAccount(
        `<CancelAppointmentRequest xmlns="urn:zimbraMail" id="${apptId}" comp="0">
			<m><su>Cancelled</su><mp ct="text/plain"><content>x</content></mp></m>
		</CancelAppointmentRequest>`, a1Token
    );
    console.log('Cancel apptId:', JSON.stringify(c2.CancelAppointmentResponse || c2.Fault));

    if (c2.Fault) {
        // Try ItemAction delete instead
        const c3 = await soap.makeSOAPEnvelopeAccount(
            `<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${apptId}"/>
			</ItemActionRequest>`, a1Token
        );
        console.log('ItemAction delete:', JSON.stringify(c3.ItemActionResponse || c3.Fault));
    }
}

process.exit(0);
