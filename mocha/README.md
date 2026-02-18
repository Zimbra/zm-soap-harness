## Confluence page:
Please use soap automation confluence page for detailed information:
https://synacor.atlassian.net/wiki/spaces/ZE/pages/5322473473/SOAP+API+and+CLI+Automation+Framework+Tests+Reports+and+CI+Integration+Overview

## Configuration:

1. Install latest node, npm and project dependencies to run the automation. Also, install visual studio code editor.

2. Export below environment variables:
```
ZIMBRA_ACCOUNT_PASSWORD
ZIMBRA_ADMIN_PASSWORD
ZIMBRA_LICENSE_ID
ZIMBRA_LICENSE_ID_LIMITED_FEATURE
GMAIL_ACCOUNT_APP_PASSWORD
```

## Clone repositories
```
git clone git@github.com:Zimbra/zm-api-automation
git clone git@github.com:Zimbra/zm-soap-client
```

## Install dependencies
```
cd zm-api-automation
npm i
```

## Configure server
If server is new and test data not created then pass `--configure true` only once to create server test domain and cos
```
SYNBUF+jitesh.sojitra@PNQW2025-JISOJI MINGW64 /c/git/zm-api-automation (master)
$ node mocha-run.js -g ActivateLicenseRequest --configure true
--------------------------------------------------------------------------------------------
[2026-02-12T23:17:59.461] [INFO] info - Server Type: CLASSIC
[2026-02-12T23:17:59.468] [INFO] info - Server Environment: ZIMBRA101_AUTOMATION
[2026-02-12T23:17:59.468] [INFO] info - Server Node: SINGLENODE
[2026-02-12T23:17:59.469] [INFO] info - Server Host: automation.zimbradev.com
[2026-02-12T23:17:59.469] [INFO] info - Zimbra Version: 10.1.16_GA_4850.NETWORK
[2026-02-12T23:17:59.470] [INFO] info - Serial: false
[2026-02-12T23:17:59.470] [INFO] info - Configure Server: true
[2026-02-12T23:17:59.471] [INFO] info - Fresh Setup: false
[2026-02-12T23:17:59.471] [INFO] info - Server Admin Auth: 0_7268e7bbc376e130a5f1c8cfd3ba...
[2026-02-12T23:18:36.456] [INFO] info - Server Domain: soapdomain.com (afcb63f9-a8b9-47b1-b9a8-ec3f26750e72)
[2026-02-12T23:18:36.457] [INFO] info - Server COS : soap (3bae5e03-cada-4f8b-b905-019a98855e09)
```

## Run tests:
To run particular test group:
```
node mocha-run.js -g Smoke
```

You can use below mocha runner to run single, multiple and test group based filtered tests.

To run particular test group:
```
node mocha-run.js -g Smoke
node mocha-run.js -g "Send message"
```

To run particular test folder:
```
node mocha-run.js tests/zimlets --zimlet true
```

You can also run particular test using .only:
```
it.only('Sanity | Try to create folder with invalid name', async() => {
```

You can specify application bug reference if bug/task is in opened state. And, after closing the ticket and build containing respective application fix, please remove the Jira ticket reference and also remove `.skip` to make it regular test.
```
it.skip('Sanity | Try to create folder with invalid name | ZCS-12345', async() => {
```

To run particular test folder with multiple tests:
```
node mocha-run.js tests/mail -g "Smoke|Sanity"
```

To run tests on particular environment by using --env:
```
node mocha-run.js -g Smoke --env zimbra101_release
node mocha-run.js -g Smoke --env zimbra101_multinode
```

To run serial tests (tests which might be restarting mailbox or server):
```
node mocha-run.js -g "Modify signature template" --serial true
```
Please don’t run serial tests when other tests are running or someone using the server. This suite is designed to run tests serially to have a test coverage for functionality which requires server or service (mailbox, proxy, mta, ldap) restart.

Meanwhile, we can also run tests using:
```
npx mocha tests -g Smoke
```

## Framework Structure:

![image](https://github.com/user-attachments/assets/bf8364ce-abd9-47bd-9e17-34d9a37f60dd)


## Test Report:

![image](https://github.com/user-attachments/assets/65465f15-1120-4a2f-ae03-40ddb87290e5)


## CircleCI Report:

![image](https://github.com/user-attachments/assets/8faba428-a862-420e-bdf9-bcb44e3277f2)

----

Note: Please don't configure Zimbra X configurations now.

# Zimbra Cloud:

To run all the tests by passing partciular/all environment variable values:
```
export serverHost=server.domain && \
    serverUser=ubuntu && \
    serverDomain=zmc.com && \
    adminPort=7071 && \
    clientPort=443 && \
    popPort=995 && \
    imapPort=993 && \
    smtpPort=465 && \
    adminAccount=admin@zmc.com && \
    adminPassword=password && \
    accountPassword=password && \
    showConsoleLog=false && \
    npm run test:smoke
```

Note: We need to explicitly set invalid login filter and dos filter max requests to higher value to avoid 429 bad status (too many requests) issue. Please refer https://wiki.zimbra.com/wiki/DoSFilter for more details. Also particular feature needs to be enabled in server to run tests successfully.
```
zimbraInvalidLoginFilterMaxFailedLogin=0
zimbraHttpDosFilterMaxRequestsPerSec=500
zimbraFeatureEwsEnabled=TRUE
zimbraFeatureMobileSyncEnabled=TRUE
zimbraImapEnabled=TRUE
zimbraPop3Enabled=TRUE
```

## Test Result:
Test passed/failed result would be available in test-reports folder. You can find full test output log in test-report.txt and html report in test-report.html.

----

# Docker Container:
https://dev-ui.zimbra-docker-registry.tk/repository/api-automation
```
docker build --tag api-automation ~/git/zm-api-automation
docker tag api-automation:latest iad.ocir.io/idtnzfdm3vg6/dev/api-automation
docker push iad.ocir.io/idtnzfdm3vg6/dev/api-automation
```

## Make Targets:
```
make all
make build
make push
```

## Run Tests Using Docker:
```
docker run -it iad.ocir.io/idtnzfdm3vg6/dev/api-automation sh -c "npm run test:smoke" | tee test-reports/smoke-report.txt
```

## Run Tests on Kubernetes Pod:
```
kubectl exec -it api-automation-0 -- bash -c "export serverHost=server.domain && npm run test:smoke"
```

## Test Result:

![image](https://user-images.githubusercontent.com/21263826/82051363-5962be80-96d7-11ea-8553-34a4574c9e63.png)