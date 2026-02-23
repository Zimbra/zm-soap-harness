# Cross-Check: XML soapvalidator vs JS Mocha — Folders

**Generated:** 2026-02-21T03:29:00.387Z

## Summary

| Metric | Count |
|--------|-------|
| Total XML test cases (filtered) | 269 |
| Total JS tests | 222 |
| Estimated missing JS tests | 49 |
| Extra JS tests (beyond XML count) | 2 |

### By Type (XML defined)

| Type | XML Count | JS Count |
|------|-----------|----------|
| Smoke | 19 | 18 |
| Sanity | 117 | 103 |
| Functional | 97 | 65 |
| Regression | 36 | 35 |

## Detailed File-by-File Comparison

> [!NOTE]
> ✅ = Full coverage, ⚠️ = Partial, ❌ = Missing/No JS file

### ❌ Searchfolder-Loop.xml
**JS File:** `searchfolder-loop.js` | **XML tests:** 11 | **JS tests:** 0 | **Missing:** ~11

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | functional | Searchfolder_loop1 | Creating 500 search folders at root level |
| 2 | functional | acctSetup3_Searchfolder_loop | Creating search folders to test various operations |
| 3 | functional | Searchfolder_loop2 | Basic test of GetSearchFolderRequest |
| 4 | functional | Searchfolder_loop3 | Creating a duplicate search folder |
| 5 | functional | Searchfolder_loop4 | Rename a with SearchFolder |
| 6 | functional | Searchfolder_loop5 | Moving a search folder to a custom folder |
| 7 | functional | Searchfolder_loop6 | Move a search folder to a search folder |
| 8 | functional | Searchfolder_loop7 | Modify a search folder |
| 9 | functional | Searchfolder_loop8 | Move a parent search folder to its child search folder |
| 10 | functional | Searchfolder_loop9 | Empty a search folder having child folders" |
| 11 | functional | Searchfolder_loop10 | Delete a search folder |

</details>

---

### ⚠️ Folder-Loop.xml
**JS File:** `folder-loop.js` | **XML tests:** 9 | **JS tests:** 2 | **Missing:** ~7

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | functional | folder_loop1 | Creating 5000 folders at root level |
| 2 | functional | acctSetup3_folder_loop | Creating a folder to test various operation |
| 3 | functional | folder_loop2 | Basic test of GetFolderRequest |
| 4 | functional | folder_loop3 | Creating a duplicate folder |
| 5 | functional | folder_loop4 | Rename a folder |
| 6 | functional | folder_loop5 | Move a folder |
| 7 | functional | folder_loop6 | Empty a folder |
| 8 | functional | folder_loop7 | Empty a folder having a sub folder in it. |
| 9 | functional | folder_loop8 | Delete a folder |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Creates 500 folders at root level |
| 2 | functional | Functional operations |

</details>

---

### ⚠️ Folder-Nested-Loop.xml
**JS File:** `folder-nested-loop.js` | **XML tests:** 8 | **JS tests:** 2 | **Missing:** ~6

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | functional | Folder_nested1 | Creating 1000 nested folders |
| 2 | functional | Folder_nested2 | Basic test of GetFolderRequest |
| 3 | functional | Folder_nested3 | Creating a duplicate folder |
| 4 | functional | Folder_nested4 | Rename a folder |
| 5 | functional | Folder_nested5 | Move a folder |
| 6 | functional | Folder_nested6 | Empty a folder |
| 7 | functional | Folder_nested7 | Empty a folder having a sub folder in it |
| 8 | functional | Folder_nested8 | Delete a folder |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Creating 100 nested folders |
| 2 | functional | Functional operations |

</details>

---

### ⚠️ Sharing\Sharing-Inherit.xml
**JS File:** `sharing\sharing-inherit.js` | **XML tests:** 10 | **JS tests:** 4 | **Missing:** ~6

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | SharingFoldersInheritBasic_01 | Verify flags="i" does not allow subfolders to be read |
| 2 | sanity | SharingFoldersInheritBasic_02 | Verify by default subfolders are allowed to be read |
| 3 | sanity | SharingFoldersInheritBasic_03 | Verify that newly-created subfolders will automatically inherit granted rights a |
| 4 | sanity | SharingFoldersInheritBasic_04 | Verify that Existing folders moved to a different point in the folder hierarchy  |
| 5 | sanity | SharingFoldersInheritBasic_05 | Verify by default read permission applies to multiple levels (4 levels) of subfo |
| 6 | sanity | SharingFoldersInheritBasic_06 | Verify that one subfolder with perm=none and flags="i" breaks the inherit proper |
| 7 | functional | SharingFoldersInheritBasic_07 | Verify by default delgatee are allowed to create a subfolder in the shared folde |
| 8 | functional | SharingFoldersInheritBasic_08 | Verify that a subfolder folder cannot be shared if parent folder has "d" permiss |
| 9 | functional | SharingFoldersInheritBasic_09 | Verify that a folder cannot be created in a folder whose parent folder has "rwi" |
| 10 | functional | SharingFoldersInheritBasic_10 | Verify that a folder cannot be moved into another whose parent folder has "rwi"  |

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

### ⚠️ Mountpoint\Create-Mountpoint.xml
**JS File:** `mountpoint\create-mountpoint.js` | **XML tests:** 18 | **JS tests:** 15 | **Missing:** ~3

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
| 9 | regression | CreateMountpointRequest8 | Verify that CreateMountpointRequest with missing attribute gives service.INVALID |
| 10 | regression | CreateMountpointRequest9 | Give CreateMountpointRequest without link tag. |
| 11 | regression | CreateMountpointRequest10 | Check if CreateMountpointRequest is given with two link tags, then second one is |
| 12 | regression | CreateMountpointRequest11 | Give CreateMountpointRequest without any attribute. |
| 13 | functional | CreateMountpointRequest12 | CreateMountPointRequest with parent-folder id is id of a default folder |
| 14 | functional | CreateMountpointRequest13 | CreateMountPointRequest with parent-folder id is id of a custom folder |
| 15 | functional | CreateMountpointRequest14 | CreateMountPointRequest mount name equal to 1) an existing mount name and 2) an  |
| 16 | functional | CreateMountpointRequest15 | Verify color and flag (as checked) can be set while creating mountpoints |
| 17 | functional | CreateMountpointRequest16 | CreateMountpointRequest should use shared folder's view by default |
| 18 | sanity | CreateMountpointRequest17 | CreateMountpointRequest to a folder that is not shared |

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

### ⚠️ Folder-Action.xml
**JS File:** `folder-action.js` | **XML tests:** 37 | **JS tests:** 35 | **Missing:** ~2

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
| 15 | sanity | FolderActionRequest14 | Change a folder's name, location, color and exclude free/busy using op="update" |
| 16 | functional | FolderActionRequest15 | Update a folder to duplicate name |
| 17 | regression | FolderActionRequest16 | Update a folder with nonexisting/deleted folder id |
| 18 | functional | FolderActionRequest17 | Change the name of a folder to duplicate name but with leading spaces (use op="u |
| 19 | functional | FolderActionRequest18 | Rename a folder to duplicate name but with trailing spaces |
| 20 | functional | FolderActionRequest19 | Update the location of a folder within itself |
| 21 | functional | FolderActionRequest20 | Delete a Folder,i.e Update it to trash location |
| 22 | regression | FolderActionRequest21 | Move a folder within a non existing folder (use op="update") |
| 23 | sanity | FolderActionRequest22 | Change the folder's color to {new-color} |
| 24 | regression | FolderActionRequest23 | Change the folder's color of deleted folder |
| 25 | sanity | FolderActionRequest24 | Set the excludeFreeBusy boolean for the folder |
| 26 | regression | FolderActionRequest25 | Set the excludeFreeBusy boolean for the deleted folder |
| 27 | sanity | FolderActionRequest26 | Set or Unset the "checked" state of the folder |
| 28 | regression | FolderActionRequest27 | Set/Unset the "checked" state of the deleted folder |
| 29 | sanity | FolderActionRequest28 | Grant and revoke the folder |
| 30 | functional | FolderActionRequest29 | Grant the folder and use zid="99999999-9999-9999-9999-999999999999" to revoke ac |
| 31 | functional | FolderActionRequest30 | Share a folder with nonexisting account |
| 32 | functional | FolderActionRequest31 | Share a folder with invalid account |
| 33 | functional | FolderActionRequest32 | Share the deleted folder with valid account |
| 34 | functional | FolderActionRequest33 | Try to revoke share without sharing a folder |
| 35 | functional | FolderActionRequest34 | Verify that emptying a folder occurs quickly (bug 11731) |
| 36 | sanity | 436682 | More Options - delete calendar -main calendar |
| 37 | sanity | bug83089 | Need folder preference for offline sync interval |

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

### ⚠️ Folders.xml
**JS File:** `folders.js` | **XML tests:** 18 | **JS tests:** 16 | **Missing:** ~2

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
| 9 | regression | CreateFolderRequest7 | Create a folder with blank parent folder name |
| 10 | regression | CreateFolderRequest8 | Create a folder with No parent folder name |
| 11 | smoke | FolderActionRequest1 | Rename a folder to unique name |
| 12 | functional | FolderActionRequest2 | Rename a folder to duplicate name |
| 13 | regression | FolderActionRequest3 | Rename a folder with nonexisting folder id |
| 14 | sanity | FolderActionRequest4 | Move a folder within some existing folder |
| 15 | functional | FolderActionRequest5 | Move a folder within itself |
| 16 | smoke | FolderActionRequest6 | Delete a Folder,i.e move it to trash |
| 17 | regression | FolderActionRequest7 | Move a folder within a non existing folder |
| 18 | smoke | FolderActionRequest7 | Move a folder within a non existing folder |

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

### ⚠️ Sharing\Sharing-Rights.xml
**JS File:** `sharing\sharing-rights.js` | **XML tests:** 7 | **JS tests:** 5 | **Missing:** ~2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | SharingFoldersBasic_01 | Verify that sharing folders with read access allows messages to be viewed, but n |
| 2 | sanity | SharingFoldersBasic_02 | Verify that sharing folders with manager (rwidx) access allows messages to be vi |
| 3 | sanity | SharingFoldersBasic_03 | Verify that sharing contacts with "none" access does not grant access to the con |
| 4 | functional | SharingFoldersBasic_11 | Verify that a folder shared with none permissions cannot be searched |
| 5 | functional | SharingFoldersBasic_12 | Verify a grantee with "ra" rights can share the folder again to another user |
| 6 | functional | SharingFoldersBasic_13 | Verify tagging a shared message does not apply |
| 7 | functional | SharingFoldersBasic_14 | Verify flagging a shared message |

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

### ❌ Sharing\Sharing-ToAdmin.xml
**JS File:** `sharing\sharing-to-admin.js` | **XML tests:** 2 | **JS tests:** 0 | **Missing:** ~2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | SharingFoldersToAdmin_01 | Verify an admin user only has user rights, if logged into the user interface |
| 2 | sanity | SharingFoldersToAdmin_02 | Verify an admin user has admin rights, if logged into the admin interface |

</details>

---

### ❌ Sharing\Sharing-ToDomainAdmin.xml
**JS File:** `sharing\sharing-to-domain-admin.js` | **XML tests:** 2 | **JS tests:** 0 | **Missing:** ~2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | SharingFoldersToDomainAdmin_01 | Verify an admin user only has user rights, if logged into the user interface |
| 2 | sanity | SharingFoldersToDomainAdmin_02 | Verify an admin user has admin rights, if logged into the admin interface |

</details>

---

### ⚠️ Folder-Create.xml
**JS File:** `folder-create.js` | **XML tests:** 18 | **JS tests:** 17 | **Missing:** ~1

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
| 7 | regression | CreateFolderRequest7 | Create a folder with blank parent folder name |
| 8 | regression | CreateFolderRequest8 | Create a folder with No parent folder name |
| 9 | functional | CreateFolderRequest9 | Create a folder with duplicate name but with leading spaces |
| 10 | functional | CreateFolderRequest10 | Create a folder with duplicate name but with trailing spaces |
| 11 | functional | CreateFolderRequest11 | Create a folder having spaces within the folder name |
| 12 | functional | CreateFolderRequest12 | Create a folder with non-latin-1 name |
| 13 | functional | CreateFolderRequest13 | Verify color and flag (as checked) can be set while creating folders |
| 14 | functional | 436615 | Verify CreateFolderRequest for flag value "#" |
| 15 | functional | CreateFolderRequest15 | Verify if f="b" is specified, it do not include any appointments from this folde |
| 16 | functional | CreateFolderRequest16 | Verify CreateFolderRequest with flag value "*" |
| 17 | functional | CreateFolderRequest17 | CreateFolderRequest works when full path is specified instead of parent folder i |
| 18 | functional | CreateFolderRequest18 | CreateFolderRequest sets the view correctly for nested folders |

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

### ⚠️ Folders-Get.xml
**JS File:** `folders-get.js` | **XML tests:** 12 | **JS tests:** 11 | **Missing:** ~1

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
| 10 | sanity | GetFolders_Visible_01 | GetFolderRequest with visible="1" and "0" for share sud-folders |
| 11 | sanity | GetFolders_Visible_02 | GetFolderRequest with visible="1" and "0" for share folders |
| 12 | sanity | GetFolders_Rest_01 | Verify the REST for each folder type and for GetInfoRequest |

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

### ⚠️ Mountpoint\Get-Mountpoint.xml
**JS File:** `mountpoint\get-mountpoint.js` | **XML tests:** 2 | **JS tests:** 1 | **Missing:** ~1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | functional | Get_MountFolder01 | Verify GetFolder by path of the shared folder works |
| 2 | functional | Get_MountFolder02 | Verify GetFolder by path of the shared sub-folder works |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Get Folder Request (Mountpoint) |

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

### ⚠️ Sharing\Grantee\Sharing-Grantee-DL.xml
**JS File:** `sharing\grantee\sharing-grantee-dl.js` | **XML tests:** 4 | **JS tests:** 3 | **Missing:** ~1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | Sharing_GranteeDL_01 | Share a folder to a DL. Verify that DL users have access. |
| 2 | sanity | Sharing_GranteeDL_02 | Unshare a folder to a DL. Verify that DL users no longer have access. |
| 3 | sanity | FoldersDelegated_DistributionList_02 | Verify that a folder can be delegated to a distribution list |
| 4 | functional | FoldersDelegated_DistributionList_03 | Verify that a folder can be delegated to a distribution list, that contains anot |

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

### ⚠️ Sharing\Sharing-Combine.xml
**JS File:** `sharing\sharing-combine.js` | **XML tests:** 8 | **JS tests:** 7 | **Missing:** ~1

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
| 8 | functional | SharingFoldersCombineBasic_12 | Verify the specific rights read and none are combined: both should be applied me |

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

### ✅ Bugs\Bug10137.xml
**JS File:** `bugs\bug10137.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | smoke | EmptyTrashFolder | Trash with nested folders should be emptied. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Trash with nested folders should be emptied. |

</details>

---

### ✅ Bugs\Bug31113.xml
**JS File:** `bugs\bug31113.js` | **XML tests:** 0 | **JS tests:** 1 | **Extra:** +1

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | always | Create a folder, give read permissions. |

</details>

---

### ✅ Bugs\Bug39804.xml
**JS File:** `bugs\bug39804.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | functional | Bug39804 | Verify login after deleting shared-to account |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | functional | Verify login after deleting shared-to account |

</details>

---

### ✅ Bugs\Bug40759.xml
**JS File:** `bugs\bug40759.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | CreateMountpoint_Bug_40759_01 | Verify error does not occur 1 : system failure: java.lang.ClassCastException: [L |
| 2 | sanity | CreateMountpoint_Bug_40759_02 | Verify error does not occur 2 : system failure: java.lang.ClassCastException: [L |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Verify error does not occur 1 : system failure: java.lang.ClassCastException: [L |
| 2 | sanity | Verify error does not occur 2 : system failure: java.lang.ClassCastException: [L |

</details>

---

### ✅ Bugs\Bug61913.xml
**JS File:** `bugs\bug61913.js` | **XML tests:** 1 | **JS tests:** 1

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
| 1 | sanity | login as the test account |

</details>

---

### ✅ Bugs\Bug66715.xml
**JS File:** `bugs\bug66715.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | bug66715_1 | Retention property does not get observed for folders when shared with manager or |
| 2 | sanity | bug66715_2 | Retention property does not get observed for folders when shared with manager or |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Retention property does not get observed for folders when shared with manager or |
| 2 | sanity | Retention property does not get observed for folders when shared with manager or |

</details>

---

### ✅ Bugs\Bug85404.xml
**JS File:** `bugs\bug85404.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | bug85404 | 'absFolderPath' not returned in notification when a folder has moved |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | \ |

</details>

---

### ✅ Bugs\Bug95572.xml
**JS File:** `bugs\bug95572.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | bug95572 | Create a folder with fie=1 i.e. no parent folder |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Create a folder with fie=1 i.e. no parent folder |

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
| 1 | sanity | Verify that the immutable folders cannot be hard deleted. |
| 2 | sanity | Verify that the immutable folders cannot be renamed. |
| 3 | sanity | Verify that the immutable folders cannot be moved. |

</details>

---

### ✅ Itemaction-Folder.xml
**JS File:** `itemaction-folder.js` | **XML tests:** 11 | **JS tests:** 11

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
| 7 | regression | ItemActionRequest7 | Delete a deleted item (folder) |
| 8 | regression | ItemActionRequest8 | Tag an item (folder) |
| 9 | sanity | ItemActionRequest9 | Mark the item (folder) as read |
| 10 | sanity | ItemActionRequest10 | Mark the item (folder) as unread |
| 11 | sanity | ItemActionRequest11 | Update the item (folder) |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | smoke | Move an item (folder) within some existing folder |
| 2 | functional | Move an item (folder) within itself |
| 3 | sanity | Delete an item (folder),i.e move it to trash |
| 4 | regression | Move an item (folder) within a non existing folder |
| 5 | sanity | Delete an item (folder) |
| 6 | regression | Move an item (folder) within a deleted folder |
| 7 | regression | Delete a deleted item (folder) |
| 8 | regression | Tag an item (folder) |
| 9 | sanity | Mark the item (folder) as read |
| 10 | sanity | Mark the item (folder) as unread |
| 11 | sanity | Update the item (folder) |

</details>

---

### ✅ Mountpoint\FolderActionRequest-Mountpoint.xml
**JS File:** `mountpoint\folderactionrequest-mountpoint.js` | **XML tests:** 1 | **JS tests:** 1

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
| 1 | sanity | FolderActionRequest on a mountpoint - delete the mountpoint |

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
| 1 | sanity | Stale mount point by Deleting target folder. |
| 2 | sanity | Stale mount point by revoking grant |
| 3 | sanity | Stale mount point by closing account |
| 4 | sanity | Stale mountpoint when target folder account is in maintenance mode |
| 5 | sanity | Stale mountpoint when target folder account is deleted |

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
| 1 | functional | Try to move mail in search folder |
| 2 | functional | Try to move contact in search folder |
| 3 | functional | Try to move a tag in search folder |
| 4 | functional | Try to move a mail folder into search folder |
| 5 | sanity | Move a search folder within another search folder |
| 6 | sanity | Move default folders into search folder |
| 7 | sanity | Move search folder to custom folders |
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
| 1 | smoke | Create Search Folder for query |

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
| 1 | sanity | Create Search Folder for query |
| 2 | sanity | Create Search Folder for query |
| 3 | sanity | Create Search Folder for query |
| 4 | sanity | Create Search Folder for query |
| 5 | sanity | Create Search Folder for query |
| 6 | sanity | Create Search Folder for query |
| 7 | sanity | Create Search Folder for query |
| 8 | sanity | Create Search Folder for query |

</details>

---

### ✅ Sharing\Bugs\Bug77298.xml
**JS File:** `sharing\bugs\bug77298.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | bug77298_01 | Verify external share can not be accessed without a password |
| 2 | sanity | bug77298_02 | Verify external share can not be accessed without a password |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Verify external share can not be accessed without a password |
| 2 | sanity | Verify external share can not be accessed without a password |

</details>

---

### ✅ Sharing\Bugs\Bug92407.xml
**JS File:** `sharing\bugs\bug92407.js` | **XML tests:** 1 | **JS tests:** 1

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | bug92407 | Error on sharing any folder with 'none' permission. |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Error on sharing any folder with \ |

</details>

---

### ✅ Sharing\Bugs\Bugs.xml
**JS File:** `sharing\bugs\bugs.js` | **XML tests:** 2 | **JS tests:** 2

<details>
<summary>XML test cases</summary>

| # | Type | TestCaseID | Objective |
|---|------|------------|----------|
| 1 | sanity | Bug_30049 | Verify "key" grantee type for folder ACL. |
| 2 | sanity | Bug_23590 | Verify Searching Shared Folders that have subfolder works fine |

</details>

<details>
<summary>JS tests</summary>

| # | Type | Description |
|---|------|-------------|
| 1 | sanity | Verify |
| 2 | sanity | Verify Searching Shared Folders that have subfolder works fine |

</details>

---

### ✅ Sharing\GetEffectiveFolderPermsRequest-Basic.xml
**JS File:** `sharing\geteffectivefolderpermsrequest-basic.js` | **XML tests:** 8 | **JS tests:** 8

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
| 1 | smoke | Verify GetEffectiveFolderPermsRequest for read access. |
| 2 | sanity | Verify GetEffectiveFolderPermsRequest for write access. |
| 3 | sanity | Verify GetEffectiveFolderPermsRequest for delete access. |
| 4 | sanity | Verify GetEffectiveFolderPermsRequest for insert access. |
| 5 | sanity | Verify GetEffectiveFolderPermsRequest for freebusy access. |
| 6 | sanity | Verify GetEffectiveFolderPermsRequest for workflow access. |
| 7 | sanity | Verify GetEffectiveFolderPermsRequest for admin access. |
| 8 | sanity | Verify GetEffectiveFolderPermsRequest for revoking the permission |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Alias.xml
**JS File:** `sharing\grantee\sharing-grantee-alias.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | smoke | Share a folder to an alias. Verify that the account has access. |
| 2 | sanity | Unshare a folder to an alias. Verify that the account no longer has access. |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-All.xml
**JS File:** `sharing\grantee\sharing-grantee-all.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | sanity | Share a folder to all. Verify that all users have access. |
| 2 | sanity | Unshare a folder to all. Verify that all users have access. |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-COS.xml
**JS File:** `sharing\grantee\sharing-grantee-cos.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | sanity | Share a folder to a COS. Verify that COS users have access. |
| 2 | sanity | Unshare a folder to a COS. Verify that COS users no longer have access. |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Domain.xml
**JS File:** `sharing\grantee\sharing-grantee-domain.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | smoke | Share a folder to a domain. Verify that all users in that domain have access. |
| 2 | sanity | Unshare a folder to all. Verify that all users have access. |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Guest.xml
**JS File:** `sharing\grantee\sharing-grantee-guest.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | sanity | Share a folder to guest. Verify that the guest has access. |
| 2 | sanity | Unshare a folder to guest. Verify that the guest no longer has access. |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-Public.xml
**JS File:** `sharing\grantee\sharing-grantee-public.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | smoke | Share a folder to public. Verify that all users have access. |
| 2 | sanity | Unshare a folder to pub. Verify that all users no longer have access. |

</details>

---

### ✅ Sharing\Grantee\Sharing-Grantee-User.xml
**JS File:** `sharing\grantee\sharing-grantee-user.js` | **XML tests:** 2 | **JS tests:** 2

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
| 1 | sanity | Share a folder to an account. Verify that the account has access. |
| 2 | sanity | Unshare a folder to an account. Verify that the account no longer has access. |

</details>

---

### ✅ Sharing\ShareLifeTime\Share-Lifetime.xml
**JS File:** `sharing\sharelifetime\share-lifetime.js` | **XML tests:** 3 | **JS tests:** 3

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
| 1 | sanity | Share a folder to guest. Verify guestgrantexpiry not set by default. |
| 2 | sanity | Share a folder to guest. Verify guestgrantexpiry not set by default.. |
| 3 | sanity | Share a folder to guest. Verify guestgrantexpiry not set by default.. |

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
| 1 | sanity | Verify that a shared immutable folders cannot be hard deleted. |
| 2 | sanity | Verify that a shared immutable folders cannot be renamed. |
| 3 | sanity | Verify that a shared immutable folders cannot be moved. |

</details>

---

### ❌ VirtualHost\VirtualHost-GetFolderRequest.xml
XML file not found

---

### ✅ VirtualHost\VirtualHost-GetInfoRequest.xml
**JS File:** `virtualhost\virtualhost-getinforequest.js` | **XML tests:** 1 | **JS tests:** 1

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
| 1 | sanity | Verify the URL for GetInfoRequest uses the virtual host name |

</details>

---

## JS Files Without XML Mapping

- `sharing\sharing-toadmin.js`
- `sharing\sharing-todomainadmin.js`

