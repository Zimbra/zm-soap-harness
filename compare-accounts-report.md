# Admin > Accounts: XML vs JS Migration Report

| # | XML File | XML Tests | JS File | JS it() | Diff | Status |
|---|---|---|---|---|---|---|
| 1 | Account-Alias-Add.xml | 26 | account-alias-add.js | 26 | 0 | ✅ |
| 2 | Account-Alias-Remove.xml | 12 | account-alias-remove.js | 12 | 0 | ✅ |
| 3 | Account-Count.xml | 1 | account-count.js | 2 | 1 | ✅ +1 |
| 4 | Account-Create-Sphchar.xml | 4 | - | 0 | -4 | ❌ MISSING |
| 5 | Account-Create01.xml | 30 | - | 0 | -30 | ❌ MISSING |
| 6 | Account-Create02.xml | 27 | - | 0 | -27 | ❌ MISSING |
| 7 | Account-Create03.xml | 36 | - | 0 | -36 | ❌ MISSING |
| 8 | Account-Create04.xml | 26 | - | 0 | -26 | ❌ MISSING |
| 9 | Account-Create05.xml | 29 | - | 0 | -29 | ❌ MISSING |
| 10 | Account-Create06.xml | 27 | - | 0 | -27 | ❌ MISSING |
| 11 | Account-Create07.xml | 35 | - | 0 | -35 | ❌ MISSING |
| 12 | Account-Delete.xml | 8 | account-delete.js | 8 | 0 | ✅ |
| 13 | Account-Device-Reminder-Set-Unset.xml | 5 | - | 0 | -5 | ❌ MISSING |
| 14 | Account-Get.xml | 19 | account-get.js | 19 | 0 | ✅ |
| 15 | Account-Getinfo.xml | 14 | account-getinfo.js | 14 | 0 | ✅ |
| 16 | Account-Getmembership.xml | 9 | account-getmembership.js | 9 | 0 | ✅ |
| 17 | Account-Rename.xml | 13 | account-rename.js | 13 | 0 | ✅ |
| 18 | AccountLoggerRequest.xml | 4 | - | 0 | -4 | ❌ MISSING |
| 19 | AccountRequest.xml | 16 | account-request.js | 16 | 0 | ✅ |
| 20 | Accounts-Loop.xml | 9 | accounts-loop.js | 9 | 0 | ✅ |
| 21 | AddressBookSizeLimit/Addressbook-Size-Limit.xml | 7 | addressbooksizelimit/addressbook-size-limit.js | 7 | 0 | ✅ |
| 22 | Bug39720.xml | 1 | bug-39720.js | 3 | 2 | ✅ +2 |
| 23 | COS/Account-Create.xml | 1 | cos/account-create.js | 1 | 0 | ✅ |
| 24 | CountAccountRequest.xml | 1 | count-account-request.js | 1 | 0 | ✅ |
| 25 | CreateAccountMulitnode1.xml | 1 | - | 0 | -1 | ❌ MISSING |
| 26 | CreateAccountMulitnode2.xml | 1 | - | 0 | -1 | ❌ MISSING |
| 27 | CreateAccountMulitnode3.xml | 1 | - | 0 | -1 | ❌ MISSING |
| 28 | ForeignPrincipal/Account-Create.xml | 4 | foreignprincipal/account-create.js | 4 | 0 | ✅ |
| 29 | ForeignPrincipal/Account-Get.xml | 6 | foreignprincipal/account-get.js | 6 | 0 | ✅ |
| 30 | ForeignPrincipal/Account-Getmembership.xml | 3 | foreignprincipal/account-getmembership.js | 3 | 0 | ✅ |
| 31 | ForeignPrincipal/Account-Modify.xml | 3 | foreignprincipal/account-modify.js | 3 | 0 | ✅ |
| 32 | ForeignPrincipal/BackupRequest.xml | 2 | foreignprincipal/backup-request.js | 2 | 0 | ✅ |
| 33 | ForeignPrincipal/Resource-Create.xml | 3 | foreignprincipal/resource-create.js | 3 | 0 | ✅ |
| 34 | ForeignPrincipal/Resource-Get.xml | 6 | foreignprincipal/resource-get.js | 6 | 0 | ✅ |
| 35 | ForeignPrincipal/Resource-Modify.xml | 3 | foreignprincipal/resource-modify.js | 3 | 0 | ✅ |
| 36 | ForeignPrincipal/SearchDirectoryRequest.xml | 2 | foreignprincipal/search-directory-request.js | 2 | 0 | ✅ |
| 37 | GetAccountMultinode.xml | 1 | get-account-multinode.js | 1 | 0 | ✅ |
| 38 | GetAllAdminAccountsRequest.xml | 1 | - | 0 | -1 | ❌ MISSING |
| 39 | LastLogon/AuthRequest.xml | 1 | lastlogon/auth-request.js | 1 | 0 | ✅ |
| 40 | LastLogon/ForeignPrincipal-AuthRequest.xml | 1 | lastlogon/foreign-principal-auth-request.js | 1 | 0 | ✅ |
| 41 | LastLogon/GetAccountRequest.xml | 2 | lastlogon/get-account-request.js | 2 | 0 | ✅ |
| 42 | LastLogon/Preauth-AuthRequest.xml | 1 | lastlogon/preauth-auth-request.js | 1 | 0 | ✅ |
| 43 | Modify-Account01.xml | 33 | modify-account-01.js | 33 | 0 | ✅ |
| 44 | Modify-Account02.xml | 26 | modify-account-02.js | 26 | 0 | ✅ |
| 45 | Modify-Account03.xml | 48 | modify-account-03.js | 47 | -1 | ⚠️ -1 |
| 46 | Modify-Account04.xml | 51 | modify-account-04.js | 51 | 0 | ✅ |
| 47 | Modify-Account05.xml | 31 | modify-account-05.js | 31 | 0 | ✅ |
| 48 | Multihost/Multihost-Account-Create.xml | 1 | multihost/multihost-account-create.js | 1 | 0 | ✅ |
| 49 | Quota/ZimbraQuotaWarnMessage.xml | 8 | quota/zimbra-quota-warn-message.js | 8 | 0 | ✅ |
| 50 | ReloadAccountRequest_Basic.xml | 4 | - | 0 | -4 | ❌ MISSING |
| 51 | Retention-Policy.xml | 9 | retention-policy.js | 9 | 0 | ✅ |
| 52 | account_migration.xml | 6 | account-migration.js | 6 | 0 | ✅ |
| | **Total** | **619** | | **390** | **-229** | |

## Summary
- XML files: 52
- JS files: 52
- XML tests (excl always): 619
- JS it() blocks: 390
- Missing JS files: 15
- Test gap: 232

## Missing JS Files
- Account-Create-Sphchar.xml (4 tests)
- Account-Create01.xml (30 tests)
- Account-Create02.xml (27 tests)
- Account-Create03.xml (36 tests)
- Account-Create04.xml (26 tests)
- Account-Create05.xml (29 tests)
- Account-Create06.xml (27 tests)
- Account-Create07.xml (35 tests)
- Account-Device-Reminder-Set-Unset.xml (5 tests)
- AccountLoggerRequest.xml (4 tests)
- CreateAccountMulitnode1.xml (1 tests)
- CreateAccountMulitnode2.xml (1 tests)
- CreateAccountMulitnode3.xml (1 tests)
- GetAllAdminAccountsRequest.xml (1 tests)
- ReloadAccountRequest_Basic.xml (4 tests)