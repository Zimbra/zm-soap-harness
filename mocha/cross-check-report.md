# Cross-Check: XML soapvalidator vs JS Mocha — Folders

**Generated:** 2026-02-15T18:22:35.782Z

## Summary

| Metric | Count |
|--------|-------|
| Total XML test cases (filtered) | 187 |
| Total JS tests | 227 |
| Estimated missing JS tests | 2 |
| Extra JS tests (beyond XML count) | 42 |

### By Type (XML defined)

| Type | XML Count | JS Count |
|------|-----------|----------|
| Smoke | 17 | 14 |
| Sanity | 91 | 101 |
| Functional | 49 | 68 |
| Regression | 30 | 44 |

## Detailed File-by-File Comparison

> [!NOTE]
> ✅ = Full coverage, ⚠️ = Partial, ❌ = Missing/No JS file

### ⚠️ Folders.xml
**JS File:** `folders.js` | **XML tests:** 17 | **JS tests:** 16 | **Missing:** ~1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | acct1_setup | create test account |
| 2 | sanity | acct1_login | login as the test account |
| 3 | smoke | CreateFolderRequest1 | Create a folder with valid name |
| 4 | functional | CreateFolderRequest2 | Create a folder with blank folder name |
| 5 | functional | CreateFolderRequest3 | Create a folder with all spaces in folder name |
| 6 | functional | CreateFolderRequest4 | Create a folder with special characters in folder name |
| 7 | functional | CreateFolderRequest5 | Create a folder with duplicate folder name |
| 8 | functional | CreateFolderRequest6 | Create a folder with nonexisting parent folder name |
| 9 | regression | CreateFolderRequest8 | Create a folder with No parent folder name |
| 10 | smoke | FolderActionRequest1 | Rename a folder to unique name |
| 11 | functional | FolderActionRequest2 | Rename a folder to duplicate name |
| 12 | regression | FolderActionRequest3 | Rename a folder with nonexisting folder id |
| 13 | sanity | FolderActionRequest4 | Move a folder within some existing folder |
| 14 | functional | FolderActionRequest5 | Move a folder within itself |
| 15 | smoke | FolderActionRequest6 | Delete a Folder,i.e move it to trash |
| 16 | regression | FolderActionRequest7 | Move a folder within a non existing folder |
| 17 | smoke | FolderActionRequest7 | Move a folder within a non existing folder |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Create a folder with valid name |
| 2 | functional | Create a folder with blank folder name |
| 3 | functional | Create a folder with all spaces in folder name |
| 4 | functional | Create a folder with special characters in folder name |
| 5 | functional | Create a folder with duplicate folder name |
| 6 | functional | Create a folder with nonexisting parent folder name |
| 7 | regression | Create a folder with blank parent folder name |
| 8 | regression | Create a folder with No parent folder name |
| 9 | smoke | Rename a folder to unique name |
| 10 | functional | Rename a folder to duplicate name |
| 11 | regression | Rename a folder with nonexisting folder id |
| 12 | sanity | Move a folder within some existing folder |
| 13 | functional | Move a folder within itself |
| 14 | smoke | Delete a Folder (move to trash) |
| 15 | regression | Move a folder within a non existing folder |
| 16 | smoke | Delete a non existing folder |

</details>

---

### ⚠️ Searchfolder-Create.xml
**JS File:** `searchfolder-create.js` | **XML tests:** 18 | **JS tests:** 17 | **Missing:** ~1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | CreateSearchFolderRequest1 | Create Search Folder for query "in:inbox" and type "message" |
| 2 | sanity | CreateSearchFolderRequest2 | Create Search Folder for query "in:inbox" and type "conversation" |
| 3 | sanity | CreateSearchFolderRequest3 | Create Search Folder for query "in:contacts" and type "message" |
| 4 | sanity | CreateSearchFolderRequest4 | Create Search Folder for query "in:contacts" and type "conversation" |
| 5 | sanity | CreateSearchFolderRequest5 | Create Search Folder for query "in:sent" and type "message" |
| 6 | sanity | CreateSearchFolderRequest6 | Create Search Folder for query "in:sent" and type "conversation" |
| 7 | sanity | CreateSearchFolderRequest7 | Create Search Folder for query "in:trash" and type "message" |
| 8 | sanity | CreateSearchFolderRequest8 | Create Search Folder for query "in:trash" and type "conversation" |
| 9 | sanity | CreateSearchFolderRequest9 | Create Search Folder with duplicate name in message view |
| 10 | sanity | CreateSearchFolderRequest10 | Create Search Folder with duplicate name in conversation view |
| 11 | regression | CreateSearchFolderRequest11 | Create Search Folder with special characters |
| 12 | regression | CreateSearchFolderRequest12 | Create Search Folder with name as numbers |
| 13 | regression | CreateSearchFolderRequest13 | Create Search Folder with name as blank |
| 14 | regression | CreateSearchFolderRequest14 | Create Search Folder with name as only spaces |
| 15 | regression | CreateSearchFolderRequest15 | Create Search Folder with names in two parts |
| 16 | regression | CreateSearchFolderRequest16 | Create Search Folder in Inbox |
| 17 | regression | CreateSearchFolderRequest17 | Create Search Folder in Inbox |
| 18 | regression | CreateSearchFolderRequest18 | Create Search Folder in Contacts folder |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Create search folder for query in:inbox type message |
| 2 | sanity | Create search folder for query in:inbox type conversation |
| 3 | sanity | Create search folder for query in:contacts type message |
| 4 | sanity | Create search folder for query in:contacts type conversation |
| 5 | sanity | Create search folder for query in:sent type message |
| 6 | sanity | Create search folder for query in:sent type conversation |
| 7 | sanity | Create search folder for query in:trash type message |
| 8 | sanity | Create search folder for query in:trash type conversation |
| 9 | sanity | Create search folder with duplicate name |
| 10 | regression | Create search folder with special characters |
| 11 | regression | Create search folder with name as numbers |
| 12 | regression | Create search folder with blank name |
| 13 | regression | Create search folder with only spaces in name |
| 14 | regression | Create search folder with spaces in name |
| 15 | regression | Create search folder in Inbox |
| 16 | regression | Create search folder in Sent |
| 17 | regression | Create search folder in Contacts |

</details>

---

### ✅ Bugs\Bug10137.xml
**JS File:** `bugs\bug-10137.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Bug 10137|Trash with nested folders should be emptied |

</details>

---

### ✅ Bugs\Bug31113.xml
**JS File:** `bugs\bug-31113.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Create folder and share it (Partial implementation - Upload skipped) |

</details>

---

### ✅ Bugs\Bug39804.xml
**JS File:** `bugs\bug-39804.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Verify sharing multiple folders (scaled down from 2000 to 10) |
| 2 | functional | Verify DeleteAccount logic (Account 3) |

</details>

---

### ✅ Bugs\Bug40759.xml
**JS File:** `bugs\bug-40759.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Bug 40759_01|Verify error does not occur when mounting folder shared with DL |
| 2 | regression | Bug 40759_02|Verify mountpoint with DL alias grant |

</details>

---

### ✅ Bugs\Bug61913.xml
**JS File:** `bugs\bug-61913.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | bug61913 | login as the test account |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Bug 61913|Update folder view to document |

</details>

---

### ✅ Bugs\Bug66715.xml
**JS File:** `bugs\bug-66715.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Bug 66715_1|Retention property observed when shared with manager rights |
| 2 | regression | Bug 66715_2|Retention property observed when shared with admin rights |

</details>

---

### ✅ Bugs\Bug85404.xml
**JS File:** `bugs\bug-85404.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Bug 85404|Verify absFolderPath not returned in notification when a folder has mo |

</details>

---

### ✅ Bugs\Bug95572.xml
**JS File:** `bugs\bug-95572.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Bug 95572|Create a folder with fie=1 i.e. no parent folder |

</details>

---

### ✅ Folder-Action.xml
**JS File:** `folder-action.js` | **XML tests:** 32 | **JS tests:** 35 | **Extra:** +3

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | FolderActionRequest1 | Rename a folder to unique name |
| 2 | functional | FolderActionRequest2 | Rename a folder to duplicate name |
| 3 | regression | FolderActionRequest3 | Rename a folder with nonexisting/deleted folder id |
| 4 | sanity | FolderActionRequest4 | Move a folder within some existing folder |
| 5 | functional | FolderActionRequest5 | Move a folder within itself |
| 6 | sanity | FolderActionRequest6 | Delete a Folder,i.e move it to trash |
| 7 | regression | FolderActionRequest7 | Move a folder within a non existing folder |
| 8 | sanity | FolderActionRequest7 | Delete an existing folder and delete a already deleted folder |
| 9 | functional | FolderActionRequest8 | Rename a folder to duplicate name but with leading spaces |
| 10 | functional | FolderActionRequest9 | Rename a folder to duplicate name but with trailing spaces |
| 11 | functional | FolderActionRequest10 | Mark all mails in folders ar read |
| 12 | functional | FolderActionRequest11 | Mark all mails in folders ar unread |
| 13 | sanity | FolderActionRequest12 | Empty a folder. |
| 14 | sanity | FolderActionRequest13 | Empty a folder having a sub folder in it. |
| 15 | functional | FolderActionRequest15 | Update a folder to duplicate name |
| 16 | regression | FolderActionRequest16 | Update a folder with nonexisting/deleted folder id |
| 17 | functional | FolderActionRequest17 | Change the name of a folder to duplicate name but with leading spaces (use op="u |
| 18 | functional | FolderActionRequest18 | Rename a folder to duplicate name but with trailing spaces |
| 19 | functional | FolderActionRequest19 | Update the location of a folder within itself |
| 20 | functional | FolderActionRequest20 | Delete a Folder,i.e Update it to trash location |
| 21 | sanity | FolderActionRequest22 | Change the folder's color to {new-color} |
| 22 | regression | FolderActionRequest23 | Change the folder's color of deleted folder |
| 23 | sanity | FolderActionRequest24 | Set the excludeFreeBusy boolean for the folder |
| 24 | regression | FolderActionRequest25 | Set the excludeFreeBusy boolean for the deleted folder |
| 25 | sanity | FolderActionRequest26 | Set or Unset the "checked" state of the folder |
| 26 | regression | FolderActionRequest27 | Set/Unset the "checked" state of the deleted folder |
| 27 | sanity | FolderActionRequest28 | Grant and revoke the folder |
| 28 | functional | FolderActionRequest29 | Grant the folder and use zid="99999999-9999-9999-9999-999999999999" to revoke ac |
| 29 | functional | FolderActionRequest31 | Share a folder with invalid account |
| 30 | functional | FolderActionRequest32 | Share the deleted folder with valid account |
| 31 | functional | FolderActionRequest33 | Try to revoke share without sharing a folder |
| 32 | sanity | 436682 | More Options - delete calendar -main calendar |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Rename a folder to unique name |
| 2 | functional | Rename a folder to duplicate name |
| 3 | regression | Rename a folder with deleted folder id |
| 4 | sanity | Move a folder within existing folder |
| 5 | functional | Move a folder within itself |
| 6 | sanity | Delete a folder by moving it to trash |
| 7 | regression | Move a folder to non-existing folder |
| 8 | sanity | Delete and re-delete a folder |
| 9 | functional | Rename a folder to duplicate name with leading spaces |
| 10 | functional | Rename a folder to duplicate name with trailing spaces |
| 11 | functional | Mark all mails in folder as read |
| 12 | functional | Try to mark folder as unread |
| 13 | sanity | Empty a folder |
| 14 | sanity | Empty a folder having a sub folder |
| 15 | sanity | Update folder name, location, color and exclude free busy|BUG-8591 |
| 16 | functional | Update a folder to duplicate name |
| 17 | regression | Update a folder with deleted folder id |
| 18 | functional | Update folder name to duplicate with leading spaces |
| 19 | functional | Update folder name to duplicate with trailing spaces |
| 20 | functional | Update folder location within itself |
| 21 | regression | Update folder location to non-existing folder|BUG-9333 |
| 22 | sanity | Change folder color |
| 23 | regression | Change color of deleted folder |
| 24 | sanity | Set and unset excludeFreeBusy for folder |
| 25 | regression | Set excludeFreeBusy for deleted folder |
| 26 | sanity | Set and unset checked state of folder |
| 27 | regression | Check or uncheck deleted folder |
| 28 | sanity | Grant and revoke folder permissions |
| 29 | functional | Grant to public and revoke using zid |
| 30 | functional | Share folder with non-existing account|BUG-107461 |
| 31 | functional | Share folder with invalid account |
| 32 | functional | Share a deleted folder with valid account |
| 33 | functional | Try to revoke share without sharing a folder |
| 34 | sanity | Try to delete immutable calendar folder |
| 35 | sanity | Set offline sync days for folder|BUG-83089 |

</details>

---

### ✅ Folder-Create.xml
**JS File:** `folder-create.js` | **XML tests:** 13 | **JS tests:** 17 | **Extra:** +4

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | CreateFolderRequest1 | Create a folder with valid name |
| 2 | functional | CreateFolderRequest2 | Create a folder with blank folder name |
| 3 | functional | CreateFolderRequest3 | Create a folder with all spaces in folder name |
| 4 | functional | CreateFolderRequest4 | Create a folder with special characters in folder name |
| 5 | functional | CreateFolderRequest5 | Create a folder with duplicate folder name |
| 6 | functional | CreateFolderRequest6 | Create a folder with nonexisting parent folder name |
| 7 | regression | CreateFolderRequest8 | Create a folder with No parent folder name |
| 8 | functional | CreateFolderRequest9 | Create a folder with duplicate name but with leading spaces |
| 9 | functional | CreateFolderRequest10 | Create a folder with duplicate name but with trailing spaces |
| 10 | functional | CreateFolderRequest11 | Create a folder having spaces within the folder name |
| 11 | functional | 436615 | Verify CreateFolderRequest for flag value "#" |
| 12 | functional | CreateFolderRequest15 | Verify if f="b" is specified, it do not include any appointments from this folde |
| 13 | functional | CreateFolderRequest16 | Verify CreateFolderRequest with flag value "*" |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Create a folder with valid name |
| 2 | functional | Create a folder with blank folder name |
| 3 | functional | Create a folder with all spaces in folder name |
| 4 | functional | Create a folder with special characters in folder name |
| 5 | functional | Create a folder with duplicate folder name |
| 6 | functional | Create a folder with nonexisting parent folder id |
| 7 | regression | Create a folder with blank parent folder id|BUG-1744 |
| 8 | regression | Create a folder with No parent folder id |
| 9 | functional | Create a folder with duplicate name but with leading spaces |
| 10 | functional | Create a folder with duplicate name but with trailing spaces |
| 11 | functional | Create a folder having spaces within the folder name |
| 12 | functional | Create a folder with non-latin name|BUG-2813 |
| 13 | functional | Create a folder with color and flag set|BUG-8170 |
| 14 | functional | Create a folder with flag value # (checked) |
| 15 | functional | Create a folder with flag value * (flagged) |
| 16 | functional | Create a folder using full path instead of parent folder id|BUG-32397 |
| 17 | functional | Create nested folders and verify view is set correctly|BUG-35890 |

</details>

---

### ✅ Folder-Loop.xml
**JS File:** `folder-loop.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Creates 500 folders at root level |
| 2 | functional | Functional operations |

</details>

---

### ✅ Folder-Nested-Loop.xml
**JS File:** `folder-nested-loop.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Creating 100 nested folders |
| 2 | functional | Functional operations |

</details>

---

### ✅ Folder-Retention-Policy.xml
**JS File:** `folder-retention-policy.js` | **XML tests:** 3 | **JS tests:** 4 | **Extra:** +1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | Folder_Retention_Policy_01 | Set folder retention policy on a folder |
| 2 | sanity | Folder_Retention_Policy_03 | Set folder retention purge policy on a folder and check if message is purged |
| 3 | sanity | Folder_Retention_Policy_04 | Set folder retention keep policy on a folder and check if message is kept |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Set folder retention keep policy |
| 2 | sanity | Set folder retention purge policy |
| 3 | functional | Set both keep and purge retention policies on the same folder |
| 4 | functional | Modify existing retention policy on a folder |

</details>

---

### ✅ Folders-Get.xml
**JS File:** `folders-get.js` | **XML tests:** 10 | **JS tests:** 11 | **Extra:** +1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | GetFolderRequest01 | Basic test of GetFolderRequest |
| 2 | sanity | GetFolderRequest02 | Verify the basic system folders present. |
| 3 | sanity | CreateFolderRequest03 | get folder with specific folder id |
| 4 | functional | CreateFolderRequest04 | get folder with deleted folder id |
| 5 | functional | CreateFolderRequest05 | get folder with specific id leading space |
| 6 | functional | CreateFolderRequest06 | get folder with specific id trailing space |
| 7 | regression | CreateFolderRequest07 | get folder with blank location |
| 8 | sanity | CreateFolderRequest08 | get folder with changed location. |
| 9 | functional | CreateFolderRequest08 | get folder with non existing folder name |
| 10 | sanity | GetFolders_Visible_02 | GetFolderRequest with visible="1" and "0" for share folders |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Basic GetFolderRequest |
| 2 | sanity | Verify basic system folders present |
| 3 | sanity | Get folder with specific folder id |
| 4 | functional | Get folder with deleted folder id |
| 5 | regression | Get folder with blank location |
| 6 | sanity | Get folder with changed location |
| 7 | functional | Get folder with non-existing folder name as id |
| 8 | sanity | Verify REST URLs in folder response|BUG-22637 |
| 9 | functional | Get folder with specific id leading space |
| 10 | functional | Get folder with specific id trailing space |
| 11 | sanity | GetFolderRequest with visible flag for share folders |

</details>

---

### ✅ Folders-Immutable.xml
**JS File:** `folders-immutable.js` | **XML tests:** 3 | **JS tests:** 3

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Folders_Immutable_Basic_01 | Verify that the immutable folders cannot be hard deleted. |
| 2 | sanity | Folders_Immutable_Basic_02 | Verify that the immutable folders cannot be renamed. |
| 3 | sanity | Folders_Immutable_Basic_03 | Verify that the immutable folders cannot be moved. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Immutable folders cannot be hard deleted |
| 2 | sanity | Immutable folders cannot be renamed |
| 3 | sanity | Immutable folders cannot be moved |

</details>

---

### ✅ Itemaction-Folder.xml
**JS File:** `itemaction-folder.js` | **XML tests:** 9 | **JS tests:** 11 | **Extra:** +2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | ItemActionRequest1 | Move an item (folder) within some existing folder |
| 2 | functional | ItemActionRequest2 | Move an item (folder) within itself |
| 3 | sanity | ItemActionRequest3 | Delete an item (folder),i.e move it to trash |
| 4 | regression | ItemActionRequest4 | Move an item (folder) within a non existing folder |
| 5 | sanity | ItemActionRequest5 | Delete an item (folder) |
| 6 | regression | ItemActionRequest6 | Move an item (folder) within a deleted folder |
| 7 | sanity | ItemActionRequest9 | Mark the item (folder) as read |
| 8 | sanity | ItemActionRequest10 | Mark the item (folder) as unread |
| 9 | sanity | ItemActionRequest11 | Update the item (folder) |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Move a folder within existing folder using ItemActionRequest |
| 2 | functional | Move a folder within itself using ItemActionRequest |
| 3 | sanity | Move a folder to trash using ItemActionRequest |
| 4 | regression | Move a folder to non-existing folder using ItemActionRequest |
| 5 | sanity | Delete a folder using ItemActionRequest |
| 6 | regression | Move a folder to a deleted folder using ItemActionRequest |
| 7 | regression | Delete already deleted folder using ItemActionRequest|BUG-11018 |
| 8 | regression | Tag a folder using ItemActionRequest|BUG-3764 |
| 9 | sanity | Mark a folder as read using ItemActionRequest |
| 10 | sanity | Try to mark a folder as unread using ItemActionRequest |
| 11 | sanity | Update a folder location using ItemActionRequest |

</details>

---

### ✅ Mountpoint\Create-Mountpoint.xml
**JS File:** `mountpoint\create-mountpoint.js` | **XML tests:** 15 | **JS tests:** 15

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | CreateMountpointRequest1 | Mount a delegated folder with all valid values. |
| 2 | functional | CreateMountpointRequest2 | Mount a delegated folder with valid values of view(conversation,message,contact, |
| 3 | regression | CreateMountpointRequest3 | Mount a delegated folder with invalid values of view(blank,space,spchar,sometext |
| 4 | regression | CreateMountpointRequest4 | Verify that with invalid(blank,space,spchar,sometext,negative,zero,largenumber,d |
| 5 | regression | CreateMountpointRequest5 | Mount a delegated folder with invalid values of zid(blank,space,spchar,sometext, |
| 6 | regression | CreateMountpointRequest6 | Mount a delegated folder with invalid values of l(blank,space,spchar,sometext,ne |
| 7 | functional | CreateMountpointRequest7a | Create two mountpoints to the same shared folder. |
| 8 | regression | CreateMountpointRequest7b | Mount more than one delegated folders at once. |
| 9 | regression | CreateMountpointRequest9 | Give CreateMountpointRequest without link tag. |
| 10 | regression | CreateMountpointRequest10 | Check if CreateMountpointRequest is given with two link tags, then second one is |
| 11 | regression | CreateMountpointRequest11 | Give CreateMountpointRequest without any attribute. |
| 12 | functional | CreateMountpointRequest12 | CreateMountPointRequest with parent-folder id is id of a default folder |
| 13 | functional | CreateMountpointRequest13 | CreateMountPointRequest with parent-folder id is id of a custom folder |
| 14 | functional | CreateMountpointRequest14 | CreateMountPointRequest mount name equal to 1) an existing mount name and 2) an  |
| 15 | sanity | CreateMountpointRequest17 | CreateMountpointRequest to a folder that is not shared |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Mount a delegated folder with all valid values |
| 2 | functional | Mount a delegated folder with valid view values |
| 3 | regression | Mount a delegated folder with invalid view values |
| 4 | regression | Mount with invalid rid values |
| 5 | regression | Mount with invalid zid values |
| 6 | regression | Mount with invalid parent folder l values |
| 7 | functional | Create two mountpoints to the same shared folder |
| 8 | regression | Mount more than one delegated folder at once |
| 9 | regression | CreateMountpointRequest without link tag |
| 10 | regression | CreateMountpointRequest with two link tags |
| 11 | regression | CreateMountpointRequest without any attribute |
| 12 | functional | Mount with parent folder as default folder id |
| 13 | functional | Mount with parent folder as custom folder id |
| 14 | functional | Mount name equal to existing mount or folder name |
| 15 | sanity | Mount a folder that is not shared |

</details>

---

### ✅ Mountpoint\FolderActionRequest-Mountpoint.xml
**JS File:** `mountpoint\folder-action-request-mountpoint.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | FolderActionRequest_Mountpoints_01 | FolderActionRequest on a mountpoint - delete the mountpoint |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | FolderActionRequest on Mountpoint (Delete) |

</details>

---

### ✅ Mountpoint\Get-Mountpoint.xml
**JS File:** `mountpoint\get-mountpoint.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Get Folder Request (Mountpoint) |

</details>

---

### ✅ Mountpoint\Stale-Mountpoint.xml
**JS File:** `mountpoint\stale-mountpoint.js` | **XML tests:** 5 | **JS tests:** 5

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Stale_Mountpoints_01 | Stale mount point by Deleting target folder. |
| 2 | sanity | Stale_Mountpoints_02 | Stale mount point by revoking grant |
| 3 | sanity | Stale_Mountpoints_03 | Stale mount point by closing account |
| 4 | sanity | Stale_Mountpoints_04 | Stale mountpoint when target folder account is in maintenance mode |
| 5 | sanity | Stale_Mountpoints_05 | Stale mountpoint when target folder account is deleted |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Deleting target folder |
| 2 | sanity | Revoking grant |
| 3 | sanity | Closing account |
| 4 | sanity | Maintenance mode |
| 5 | sanity | Deleting target account |

</details>

---

### ✅ Searchfolder-Action.xml
**JS File:** `searchfolder-action.js` | **XML tests:** 10 | **JS tests:** 10

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | functional | SearchFolderAction1 | Try to move mail in search folder |
| 2 | functional | SearchFolderAction2 | Try to move contact in search folder |
| 3 | functional | SearchFolderAction3 | Try to move a tag in search folder |
| 4 | functional | SearchFolderAction4 | Try to move a mail folder into search folder |
| 5 | sanity | SearchFolderAction5 | Move a search folder within another search folder |
| 6 | sanity | SearchFolderAction6 | Move default folders into search folder |
| 7 | sanity | SearchFolderAction7 | Move search folder to custom folders |
| 8 | sanity | SearchFolderAction8 | Rename a search folder |
| 9 | sanity | SearchFolderAction9 | Delete a search folder |
| 10 | regression | SearchFolderAction10 | Delete already deleted search folder |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Try to move mail into search folder |
| 2 | functional | Try to move contact into search folder |
| 3 | functional | Try to move a tag into search folder |
| 4 | functional | Try to move folder into search folder |
| 5 | sanity | Move search folder within another search folder |
| 6 | sanity | Move default folders into search folder should fail |
| 7 | sanity | Move search folder to system folder |
| 8 | sanity | Rename a search folder |
| 9 | sanity | Delete a search folder |
| 10 | regression | Delete already deleted search folder |

</details>

---

### ✅ Searchfolder-Get.xml
**JS File:** `searchfolder-get.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | GetSearchFolderRequest1 | Create Search Folder for query "in:inbox" and type "message" |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Create and get search folder |

</details>

---

### ✅ Searchfolder-Loop.xml
**JS File:** `searchfolder-loop.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Searchfolder-Loop placeholder |

</details>

---

### ✅ Searchfolder-Modify.xml
**JS File:** `searchfolder-modify.js` | **XML tests:** 8 | **JS tests:** 8

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | ModifySearchFolderRequest1 | Create Search Folder for query "in:inbox" and type "message" then modify search  |
| 2 | sanity | ModifySearchFolderRequest2 | Create Search Folder for query "in:inbox" and type "conversation" then modify se |
| 3 | sanity | ModifySearchFolderRequest3 | Create Search Folder for query "in:contacts" then modify search folder with quer |
| 4 | sanity | ModifySearchFolderRequest4 | Create Search Folder for query "in:contacts" then modify search folder with quer |
| 5 | sanity | ModifySearchFolderRequest5 | Create Search Folder for query "in:sent" and type "message" then modify search f |
| 6 | sanity | ModifySearchFolderRequest6 | Create Search Folder for query "in:sent" and type "conversation" then modify sea |
| 7 | sanity | ModifySearchFolderRequest7 | Create Search Folder for query "in:trash" then modify search folder with query=" |
| 8 | sanity | ModifySearchFolderRequest8 | Create Search Folder for query "in:trash" then modify search folder with query " |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Modify search folder query from in:inbox to in:contacts (type message) |
| 2 | sanity | Modify search folder query from in:inbox to in:contacts (type conversation) |
| 3 | sanity | Modify search folder query from in:contacts to in:inbox (type message) |
| 4 | sanity | Modify search folder query from in:contacts to in:inbox (type conversation) |
| 5 | sanity | Modify search folder query from in:sent to in:trash |
| 6 | sanity | Modify search folder query from in:sent (conversation) to in:trash (message) |
| 7 | sanity | Modify search folder query to is:anywhere not in:trash |
| 8 | sanity | Modify search folder query from in:trash to in:junk |

</details>

---

### ✅ Sharing\Bugs\Bug77298.xml
**JS File:** `sharing\bugs\bug-77298.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Verify external share cannot be accessed without a password (pw= |
| 2 | sanity | Verify external share cannot be accessed without a password (no pw attribute) |

</details>

---

### ✅ Sharing\Bugs\Bug92407.xml
**JS File:** `sharing\bugs\bug-92407.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | regression | Error on sharing any folder with |

</details>

---

### ❌ Sharing\Bugs\Bugs.xml
**JS File:** `UNMAPPED` | **XML tests:** 0 | **JS tests:** 0

---

### ✅ Sharing\GetEffectiveFolderPermsRequest-Basic.xml
**JS File:** `sharing\get-effective-folder-perms-basic.js` | **XML tests:** 8 | **JS tests:** 8

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | GetEffectiveFolderPermsRequest_01 | Verify GetEffectiveFolderPermsRequest for read access. |
| 2 | sanity | GetEffectiveFolderPermsRequest_02 | Verify GetEffectiveFolderPermsRequest for write access. |
| 3 | sanity | GetEffectiveFolderPermsRequest_03 | Verify GetEffectiveFolderPermsRequest for delete access. |
| 4 | sanity | GetEffectiveFolderPermsRequest_04 | Verify GetEffectiveFolderPermsRequest for insert access. |
| 5 | sanity | GetEffectiveFolderPermsRequest_05 | Verify GetEffectiveFolderPermsRequest for freebusy access. |
| 6 | sanity | GetEffectiveFolderPermsRequest_06 | Verify GetEffectiveFolderPermsRequest for workflow access. |
| 7 | sanity | GetEffectiveFolderPermsRequest_07 | Verify GetEffectiveFolderPermsRequest for admin access. |
| 8 | sanity | GetEffectiveFolderPermsRequest_08 | Verify GetEffectiveFolderPermsRequest for revoking the permission |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | GetEffectiveFolderPermsRequest for read access |
| 2 | sanity | GetEffectiveFolderPermsRequest for write access |
| 3 | sanity | GetEffectiveFolderPermsRequest for delete access |
| 4 | sanity | GetEffectiveFolderPermsRequest for insert access |
| 5 | sanity | GetEffectiveFolderPermsRequest for freebusy access |
| 6 | sanity | GetEffectiveFolderPermsRequest for workflow access |
| 7 | sanity | GetEffectiveFolderPermsRequest for admin access |
| 8 | sanity | GetEffectiveFolderPermsRequest after revoking permission |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Alias.xml
**JS File:** `sharing\grantee\alias.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | Sharing_GranteeAlias_01 | Share a folder to an alias. Verify that the account has access. |
| 2 | sanity | Sharing_GranteeAlias_02 | Unshare a folder to an alias. Verify that the account no longer has access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: Alias (usr alias) |
| 2 | sanity | Unshare folder from alias, verify no access |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-All.xml
**JS File:** `sharing\grantee\all.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Sharing_GranteeAll_01 | Share a folder to all. Verify that all users have access. |
| 2 | sanity | Sharing_GranteeAll_02 | Unshare a folder to all. Verify that all users have access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: All (all) |
| 2 | sanity | Unshare folder from all, verify no access |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-COS.xml
**JS File:** `sharing\grantee\cos.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Sharing_GranteeCOS_01 | Share a folder to a COS. Verify that COS users have access. |
| 2 | sanity | Sharing_GranteeCOS_02 | Unshare a folder to a COS. Verify that COS users no longer have access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: COS (cos) |
| 2 | sanity | Unshare folder from COS, verify no access |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-DL.xml
**JS File:** `sharing\grantee\dl.js` | **XML tests:** 3 | **JS tests:** 3

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | Sharing_GranteeDL_01 | Share a folder to a DL. Verify that DL users have access. |
| 2 | sanity | Sharing_GranteeDL_02 | Unshare a folder to a DL. Verify that DL users no longer have access. |
| 3 | functional | FoldersDelegated_DistributionList_03 | Verify that a folder can be delegated to a distribution list, that contains anot |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: Distribution List (grp) |
| 2 | sanity | Unshare folder from DL, verify no access |
| 3 | functional | Delegate folder to nested DL (DL within DL) |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Domain.xml
**JS File:** `sharing\grantee\domain.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | Sharing_GranteeDomain_01 | Share a folder to a domain. Verify that all users in that domain have access. |
| 2 | sanity | Sharing_GranteeDomain_02 | Unshare a folder to all. Verify that all users have access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: Domain (dom) |
| 2 | sanity | Unshare folder from domain, verify no access |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Guest.xml
**JS File:** `sharing\grantee\guest.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Sharing_GranteeGuest_01 | Share a folder to guest. Verify that the guest has access. |
| 2 | sanity | Sharing_GranteeGuest_02 | Unshare a folder to guest. Verify that the guest no longer has access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: Guest (guest) |
| 2 | sanity | Unshare folder from guest, verify grant removed |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Public.xml
**JS File:** `sharing\grantee\public.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | Sharing_GranteePublic_01 | Share a folder to public. Verify that all users have access. |
| 2 | sanity | Sharing_GranteePublic_02 | Unshare a folder to pub. Verify that all users no longer have access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: Public (pub) |
| 2 | sanity | Unshare folder from public, verify no access |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-User.xml
**JS File:** `sharing\grantee\user.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Sharing_GranteeUser_01 | Share a folder to an account. Verify that the account has access. |
| 2 | sanity | Sharing_GranteeUser_02 | Unshare a folder to an account. Verify that the account no longer has access. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Grantee: User (usr) |
| 2 | sanity | Unshare folder from user, verify no access |

</details>

---

### ✅ Sharing\ShareLifeTime\Share-Lifetime.xml
**JS File:** `sharing\share-lifetime\share-lifetime.js` | **XML tests:** 3 | **JS tests:** 3

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Sharing_GuestGtantExpiry_01 | Share a folder to guest. Verify guestgrantexpiry not set by default. |
| 2 | sanity | Sharing_GuestGrantExpiry_02 | Share a folder to guest. Verify guestgrantexpiry not set by default.. |
| 3 | sanity | Sharing_GuestGrantExpiry_03 | Share a folder to guest. Verify guestgrantexpiry not set by default.. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Verify Guest Grant Expiry and Internal Grant Expiry |
| 2 | sanity | Verify Guest-only share has guestGrantExpiry but no internalGrantExpiry |
| 3 | sanity | Verify Internal-only share has internalGrantExpiry but no guestGrantExpiry |

</details>

---

### ✅ Sharing\Sharing-Combine.xml
**JS File:** `sharing\sharing-combine.js` | **XML tests:** 7 | **JS tests:** 7

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | SharingFoldersCombineBasic_01 | Verify that rights combine when a folder is shared with an account (read) and a  |
| 2 | sanity | SharingFoldersCombineBasic_02 | Verify that rights combine when a folder is shared with an account (read) and a  |
| 3 | sanity | SharingFoldersCombineBasic_03 | Verify that rights combine when a folder is shared with an account (read) and a  |
| 4 | sanity | SharingFoldersCombineBasic_04 | Verify that rights combine when a folder is shared with an account (read) and al |
| 5 | sanity | SharingFoldersCombineBasic_05 | Verify that rights combine when a folder is shared with an account (read) and a  |
| 6 | functional | SharingFoldersCombineBasic_06 | Verify that rights combine when a folder is shared with an account (read) and a  |
| 7 | sanity | SharingFoldersCombineBasic_11 | Verify that different combinations of rights can be combined (read + insert) |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Combine rights: Account(Read) + Group(Delete) |
| 2 | sanity | Combine rights: Account(Read) + Domain(Delete) |
| 3 | sanity | Combine rights: Account(Read) + COS(Delete) |
| 4 | sanity | Combine rights: Account(Read) + All(Delete) |
| 5 | sanity | Combine rights: Account(Read) + Guest(Delete) |
| 6 | functional | Combine rights: Account(Read) + Public(Delete) |
| 7 | sanity | Combine different rights: Read + Insert |

</details>

---

### ✅ Sharing\Sharing-Immutable.xml
**JS File:** `sharing\sharing-immutable.js` | **XML tests:** 3 | **JS tests:** 3

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Sharing_Immutable_Basic_01 | Verify that a shared immutable folders cannot be hard deleted. |
| 2 | sanity | Sharing_Immutable_Basic_02 | Verify that a shared immutable folders cannot be renamed. |
| 3 | sanity | Sharing_Immutable_Basic_03 | Verify that a shared immutable folders cannot be moved. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Immutable Folders|Cannot delete system folders |
| 2 | sanity | Immutable Folders|Cannot rename system folders |
| 3 | sanity | Immutable Folders|Cannot move system folders |

</details>

---

### ✅ Sharing\Sharing-Inherit.xml
**JS File:** `sharing\sharing-inherit.js` | **XML tests:** 1 | **JS tests:** 4 | **Extra:** +3

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | SharingFoldersInheritBasic_04 | Verify that Existing folders moved to a different point in the folder hierarchy  |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Verify flags= |
| 2 | sanity | Verify by default subfolders accept inherited rights |
| 3 | functional | Multi-level nesting inherits rights through 3 levels |
| 4 | functional | Subfolder with separate grant overrides parent rights |

</details>

---

### ✅ Sharing\Sharing-Rights.xml
**JS File:** `sharing\sharing-rights.js` | **XML tests:** 1 | **JS tests:** 5 | **Extra:** +4

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | SharingFoldersBasic_02 | Verify that sharing folders with manager (rwidx) access allows messages to be vi |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Rights: Read Only |
| 2 | sanity | Rights: Manager (rwidx) |
| 3 | functional | Rights: Write Only (w) |
| 4 | functional | Rights: Insert Only (i) |
| 5 | functional | Rights: Delete Only (d) |

</details>

---

### ✅ Sharing\Sharing-ToAdmin.xml
**JS File:** `sharing\sharing-to-admin.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Admin as User: Respects Read-Only share |
| 2 | sanity | Admin as Admin: Overrides permissions (Superuser) |

</details>

---

### ✅ Sharing\Sharing-ToDomainAdmin.xml
**JS File:** `sharing\sharing-to-domain-admin.js` | **XML tests:** 0 | **JS tests:** 2 | **Extra:** +2

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Domain Admin as User: Respects Read-Only share |
| 2 | sanity | Domain Admin as Admin: Still DOES NOT override permissions (unlike Global Admin? |

</details>

---

### ✅ VirtualHost\VirtualHost-GetFolderRequest.xml
**JS File:** `virtualhost\virtual-host-get-folder-request.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Get Folder Request in Virtual Host Domain |

</details>

---

### ✅ VirtualHost\VirtualHost-GetInfoRequest.xml
**JS File:** `virtualhost\virtual-host-get-info-request.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | VirtualHost_GetInfoRequest_01 | Verify the URL for GetInfoRequest uses the virtual host name |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Get Info Request in Virtual Host Domain |

</details>

---

## JS Files Without XML Mapping

- `sharing\bugs\bug-23590.js`
- `sharing\bugs\bug-30049.js`

