#!/bin/sh
wget -O regular.xml http://zimbra-stage-license-vip.vmware.com/zimbraLicensePortal/QA/LKManager --post-data="AccountsLimit=-1&ArchivingAccountsLimit=-1&AttachmentIndexingAccountsLimit=-1&ISyncAccountsLimit=-1&MAPIConnectorAccountsLimit=-1&MobileSyncAccountsLimit=-1&SMIMEAccountsLimit=-1&InstallType=regular" --no-proxy
