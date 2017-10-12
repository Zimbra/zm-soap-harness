# Zimbra SOAP-Harness

## Introduction
This harness enables you to execute soap automation for supported functionality in FOSS

## Steps
1. Clone following git repos:
- git clone https://github.com/Zimbra/zimbra-package-stub.git
- git clone https://github.com/Zimbra/zm-zcs.git
- git clone https://github.com/Zimbra/zm-mailbox.git
- git clone https://github.com/Zimbra/zm-soap-harness.git

2. Go to zm-mailbox directory and execute following command to generate necessary zimbra dependencies:
   `ant clean-ant publish-local-all -Dzimbra.buildinfo.version=8.8.3_GA`

3. Go to zm-soap-harness directory and run jar target to get zm-qa jar:
   `ant jar`

4. To build soapdata directory, run build-soap-data-file target:
   `ant build-soap-data-file`

5. To execute any individual testcase or a test suite, update "Run SoapTestCore"" target and execute it:
- Running individual testcase, update the "value" parameter as:
	`value="data/soapvalidator/MailClient/Auth/auth_basic.xml"`
- Running who suite, update the "value" parameter as:
	`value="data/soapvalidator/MailClient/Auth/"`
- To execute the target, run following command:
	`ant "Run SoapTestCore"`
