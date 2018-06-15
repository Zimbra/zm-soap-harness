# Zimbra SOAP-Harness

## Introduction
This harness enables you to execute soap automation tests for supported functionality in FOSS

## Steps
1. Clone the following repositories:
- git clone https://github.com/Zimbra/zimbra-package-stub.git
- git clone https://github.com/Zimbra/zm-zcs.git
- git clone https://github.com/Zimbra/zm-mailbox.git
- git clone https://github.com/Zimbra/zm-soap-harness.git

2. Create a directory as `~/.ivy2/cache` if not present.

3. Go to zm-mailbox directory and execute following command to generate necessary zimbra dependencies:

   `ant clean-ant publish-local-all -Dzimbra.buildinfo.version=8.8.3_GA`

4. Go to zm-soap-harness directory and run jar target to get zm-soap-harness jar:

   `ant jar`

5. To build soapdata.tar run the following target:

   `ant build-soap-data-file`

6. To create soap-harness testware in .tgz, execute the following command:

   `ant build-testware` 

7. To execute soap tests, run following command:
    
   `ant "Run-SoapTestCore"`
   
8. To execute any individual testcase or a test suite, update "Run-SoapTestCore"" target and execute it:
- Running individual testcase, update the "value" parameter as:

	`value="data/soapvalidator/MailClient/Auth/auth_basic.xml"`
- Running the complete suite, update the "value" parameter as:

	`value="data/soapvalidator/MailClient/Auth/"`
