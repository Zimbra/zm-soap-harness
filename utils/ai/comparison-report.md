# XML vs JS Test Comparison — Detailed Report

Generated: 2026-02-22T13:03:33.527Z

## Summary Table

| # | File | XML Sm | JS Sm | XML Sa | JS Sa | XML Fn | JS Fn | XML Rg | JS Rg | XML Total | JS Total | Status |
|---|------|--------|-------|--------|-------|--------|-------|--------|-------|-----------|----------|--------|
| 1 | folder-action.js | 1 | 1 | 12 | 12 | 17 | 17 | 7 | 7 | 37 | 37 | ✅ |
| 2 | folder-create.js | 1 | 1 | 0 | 0 | 15 | 14 | 2 | 2 | 18 | 17 | ⚠️ -1 |
| 3 | folder-loop.js | 0 | 0 | 0 | 0 | 9 | 9 | 0 | 0 | 9 | 9 | ✅ |
| 4 | folder-nested-loop.js | 0 | 0 | 0 | 0 | 8 | 9 | 0 | 0 | 8 | 9 | ⚠️ +1 |
| 5 | folder-retention-policy.js | 1 | 1 | 2 | 1 | 0 | 2 | 0 | 0 | 3 | 4 | ⚠️ +1 |
| 6 | folders.js | 4 | 4 | 4 | 1 | 7 | 7 | 4 | 4 | 19 | 16 | ⚠️ -3 |
| 7 | folders-get.js | 1 | 1 | 6 | 6 | 4 | 4 | 1 | 1 | 12 | 12 | ✅ |
| 8 | folders-immutable.js | 0 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 3 | ✅ |
| 9 | itemaction-folder.js | 1 | 1 | 5 | 5 | 1 | 1 | 4 | 4 | 11 | 11 | ✅ |
| 10 | searchfolder-action.js | 0 | 0 | 5 | 5 | 4 | 4 | 1 | 1 | 10 | 10 | ✅ |
| 11 | searchfolder-create.js | 0 | 0 | 10 | 10 | 0 | 0 | 8 | 8 | 18 | 18 | ✅ |
| 12 | searchfolder-get.js | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | ✅ |
| 13 | searchfolder-loop.js | 0 | 0 | 0 | 0 | 11 | 12 | 0 | 0 | 11 | 12 | ⚠️ +1 |
| 14 | searchfolder-modify.js | 0 | 0 | 8 | 8 | 0 | 0 | 0 | 0 | 8 | 8 | ✅ |
| 15 | geteffectivefolderpermsrequest-basic.js | 1 | 1 | 7 | 7 | 0 | 0 | 0 | 0 | 8 | 8 | ✅ |
| 16 | sharing-combine.js | 1 | 1 | 5 | 5 | 2 | 2 | 0 | 0 | 8 | 8 | ✅ |
| 17 | sharing-immutable.js | 0 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 3 | ✅ |
| 18 | sharing-inherit.js | 0 | 0 | 6 | 5 | 4 | 5 | 0 | 0 | 10 | 10 | ✅ |
| 19 | sharing-rights.js | 1 | 1 | 2 | 3 | 4 | 3 | 0 | 0 | 7 | 7 | ✅ |
| 20 | sharing-toadmin.js | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | ✅ |
| 21 | sharing-todomainadmin.js | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 2 | ✅ |
| 22 | create-mountpoint.js | 1 | 1 | 1 | 2 | 7 | 6 | 9 | 9 | 18 | 18 | ✅ |
| 23 | folderactionrequest-mountpoint.js | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | ✅ |
| 24 | get-mountpoint.js | 0 | 0 | 0 | 0 | 2 | 2 | 0 | 0 | 2 | 2 | ✅ |
| 25 | stale-mountpoint.js | 0 | 0 | 5 | 5 | 0 | 0 | 0 | 0 | 5 | 5 | ✅ |
| 26 | virtualhost-getinforequest.js | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | ✅ |
| | **TOTALS** | **14** | **14** | **90** | **87** | **95** | **97** | **36** | **36** | **235** | **234** | |

**Matched:** 21/26 files | **Mismatched:** 5/26 files

---

## Detailed Mismatch Analysis

### folder-create.js (XML: 18, JS: 17, Diff: -1)

**Functional:** XML=15, JS=14

<details><summary>XML Test Objectives</summary>

- [smoke] Create a folder with valid name
- [functional] Create a folder with blank folder name
- [functional] Create a folder with all spaces in folder name
- [functional] Create a folder with special characters in folder name
- [functional] Create a folder with duplicate folder name
- [functional] Create a folder with nonexisting parent folder name
- [functional] Create a folder with duplicate name but with leading spaces
- [functional] Create a folder with duplicate name but with trailing spaces
- [functional] Create a folder having spaces within the folder name
- [functional] Create a folder with non-latin-1 name
- [functional] Verify color and flag (as checked) can be set while creating folders
- [functional] Verify CreateFolderRequest for flag value "#"
- [functional] Verify if f="b" is specified, it do not include any appointments from this folder in the users F/B
- [functional] Verify CreateFolderRequest with flag value "*"
- [functional] CreateFolderRequest works when full path is specified instead of parent folder id
- [functional] CreateFolderRequest sets the view correctly for nested folders
- [regression] Create a folder with blank parent folder name
- [regression] Create a folder with No parent folder name

</details>

<details><summary>JS Test Names</summary>

- Smoke | Create a folder with valid name
- Functional | Create a folder with blank folder name
- Functional | Create a folder with all spaces in folder name
- Functional | Create a folder with special characters in folder name
- Functional | Create a folder with duplicate folder name
- Functional | Create a folder with nonexisting parent folder id
- Functional | Create a folder with duplicate name but with leading spaces
- Functional | Create a folder with duplicate name but with trailing spaces
- Functional | Create a folder having spaces within the folder name
- Functional | Create a folder with non-latin name | BUG-2813
- Functional | Create a folder with color and flag set | BUG-8170
- Functional | Create a folder with flag value # (checked)
- Functional | Create a folder with flag value * (flagged)
- Functional | Create a folder using full path instead of parent folder id | BUG-32397
- Functional | Create nested folders and verify view is set correctly | BUG-35890
- Regression | Create a folder with blank parent folder id | BUG-1744
- Regression | Create a folder with No parent folder id

</details>

### folder-nested-loop.js (XML: 8, JS: 9, Diff: +1)

**Functional:** XML=8, JS=9

<details><summary>XML Test Objectives</summary>

- [functional] Creating 1000 nested folders
- [functional] Basic test of GetFolderRequest
- [functional] Creating a duplicate folder
- [functional] Rename a folder
- [functional] Move a folder
- [functional] Empty a folder
- [functional] Empty a folder having a sub folder in it
- [functional] Delete a folder

</details>

<details><summary>JS Test Names</summary>

- Functional | Creating 100 nested folders
- Functional | Creating a folder to test various operations
- Functional | Basic test of GetFolderRequest
- Functional | Creating a duplicate folder
- Functional | Rename a folder
- Functional | Move a folder
- Functional | Empty a folder
- Functional | Empty a folder having a sub folder in it
- Functional | Delete a folder

</details>

### folder-retention-policy.js (XML: 3, JS: 4, Diff: +1)

**Sanity:** XML=2, JS=1

**Functional:** XML=0, JS=2

<details><summary>XML Test Objectives</summary>

- [smoke] Set folder retention policy on a folder
- [sanity] Set folder retention purge policy on a folder and check if message is purged
- [sanity] Set folder retention keep policy on a folder and check if message is kept

</details>

<details><summary>JS Test Names</summary>

- Smoke | Set folder retention keep policy
- Sanity | Set folder retention purge policy
- Functional | Set both keep and purge retention policies on the same folder
- Functional | Modify existing retention policy on a folder

</details>

### folders.js (XML: 19, JS: 16, Diff: -3)

**Sanity:** XML=4, JS=1

<details><summary>XML Test Objectives</summary>

- [smoke] Create a folder with valid name
- [smoke] Rename a folder to unique name
- [smoke] Delete a Folder,i.e move it to trash
- [smoke] Move a folder within a non existing folder
- [sanity] basic system check
- [sanity] create test account
- [sanity] login as the test account
- [sanity] Move a folder within some existing folder
- [functional] Create a folder with blank folder name
- [functional] Create a folder with all spaces in folder name
- [functional] Create a folder with special characters in folder name
- [functional] Create a folder with duplicate folder name
- [functional] Create a folder with nonexisting parent folder name
- [functional] Rename a folder to duplicate name
- [functional] Move a folder within itself
- [regression] Create a folder with blank parent folder name
- [regression] Create a folder with No parent folder name
- [regression] Rename a folder with nonexisting folder id
- [regression] Move a folder within a non existing folder

</details>

<details><summary>JS Test Names</summary>

- Smoke | Create a folder with valid name
- Smoke | Rename a folder to unique name
- Smoke | Delete a Folder (move to trash)
- Smoke | Delete a non existing folder
- Sanity | Move a folder within some existing folder
- Functional | Create a folder with blank folder name
- Functional | Create a folder with all spaces in folder name
- Functional | Create a folder with special characters in folder name
- Functional | Create a folder with duplicate folder name
- Functional | Create a folder with nonexisting parent folder name
- Functional | Rename a folder to duplicate name
- Functional | Move a folder within itself
- Regression | Create a folder with blank parent folder name
- Regression | Create a folder with No parent folder name
- Regression | Rename a folder with nonexisting folder id
- Regression | Move a folder within a non existing folder

</details>

### searchfolder-loop.js (XML: 11, JS: 12, Diff: +1)

**Functional:** XML=11, JS=12

<details><summary>XML Test Objectives</summary>

- [functional] Creating 500 search folders at root level
- [functional] Creating search folders to test various operations
- [functional] Basic test of GetSearchFolderRequest
- [functional] Creating a duplicate search folder
- [functional] Rename a with SearchFolder
- [functional] Moving a search folder to a custom folder
- [functional] Move a search folder to a search folder
- [functional] Modify a search folder
- [functional] Move a parent search folder to its child search folder
- [functional] Empty a search folder having child folders"
- [functional] Delete a search folder

</details>

<details><summary>JS Test Names</summary>

- Functional | Creating 500 search folders at root level
- Functional | Creating search folders to test various operations
- Functional | Basic test of GetSearchFolderRequest
- Functional | Creating a duplicate search folder
- Functional | Rename a search folder with valid name
- Functional | Rename a search folder with already existing folder name
- Functional | Moving a search folder to a custom folder | BUG-4187
- Functional | Move a search folder to a search folder
- Functional | Modify a search folder
- Functional | Move a parent search folder to its child search folder
- Functional | Empty a search folder having child folders
- Functional | Delete a search folder

</details>

