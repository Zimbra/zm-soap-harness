import config from '../../conf/config.js';
import common from '../core/common.js';
import ewsClient from 'ews-javascript-api';

const exchangeService = new ewsClient.ExchangeService(ewsClient.ExchangeVersion.Exchange2013);
exchangeService.Url = new ewsClient.Uri(`https://${config.serverHost}:${config.clientPort}/EWS/Exchange.asmx?wsdl`);
let messageSentStatus = false;

const ews = {
	async sendMessageUsingEWS({ fromEmailAddress, password, subject, toEmailAddress, body } = {}) {
		common.log(`Send message using ews: ${subject}`);

		exchangeService.Credentials = new ewsClient.WebCredentials(fromEmailAddress, password);
		const message = new ewsClient.EmailMessage(exchangeService);
		message.Subject = subject;
		message.Body = new ewsClient.MessageBody(ewsClient.BodyType.Text, body);
		toEmailAddress = [].concat(toEmailAddress);

		for (let i = 0; i < toEmailAddress.length; i++) {
			message.ToRecipients.Add(new ewsClient.EmailAddress('', toEmailAddress[i]));
		}

		await message.SendAndSaveCopy(ewsClient.WellKnownFolderName.SentItems);
		common.log(message.Subject, message.Body, message.ToRecipients);
		common.log(ewsClient.WellKnownFolderName.SentItems);
		messageSentStatus = true;

		return messageSentStatus;
	}
};

export default ews;