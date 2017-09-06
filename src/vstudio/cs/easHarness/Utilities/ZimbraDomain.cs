using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using log4net;

namespace Utilities
{
    public class ZimbraDomain
    {
        protected ILog logger = LogManager.GetLogger(typeof(ZimbraDomain));

        private String MyDomainName;
        private String MyDomainGalSyncAccountID;
        private String MyDomainGalSyncDatasourceID;

        public ZimbraDomain(String domain)
        {
            MyDomainName = domain;
        }

        public ZimbraDomain provision()
        {

            if (exists())
            {
                logger.Info(MyDomainName + " already exists.  Not provisioning again.");
                return (this);
            }

            // If the domain does not exist, create it
            ZimbraAdminAccount.GlobalAdmin.soapSend(
                        "<CreateDomainRequest xmlns='urn:zimbraAdmin'>"
                    + "<name>" + MyDomainName + "</name>"
                    + "<a n='zimbraGalMode'>zimbra</a>"
                    + "<a n='zimbraGalMaxResults'>15</a>"
                    + "</CreateDomainRequest>");


            this.createGalSyncAccount();

            this.syncGalAccount();

            return (this);
        }

        public Boolean exists()
        {

            // Check if the domain exists
            XmlDocument GetDomainResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                        "<GetDomainRequest xmlns='urn:zimbraAdmin'>"
                    + "<domain by='name'>" + MyDomainName + "</domain>"
                    + "</GetDomainRequest>");

            XmlNode node = ZimbraAdminAccount.GlobalAdmin.soapSelect(GetDomainResponse, "//admin:GetDomainResponse");

            // If the domain exists, there will be an id
            if (node == null)
            {
                return (false);
            }

            // If there was a response, make sure we have the up to date information
            MyDomainGalSyncAccountID = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(GetDomainResponse, "//admin:GetDomainResponse//admin:a[@n='zimbraGalAccountId']", null);
            logger.Info("DomainGalSyncAccountID=" + MyDomainGalSyncAccountID);

            if (MyDomainGalSyncAccountID == null)
            {
                throw new HarnessException("Domain " + MyDomainName + " does not have a zimbraGalAccountId.  Hint: Don't use 'host.local' in global.properties - just make up a domain name.");
            }

            XmlDocument GetDataSourcesResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                        "<GetDataSourcesRequest xmlns='urn:zimbraAdmin'>"
                    +   "<id>" + MyDomainGalSyncAccountID + "</id>"
                    + "</GetDataSourcesRequest>");

            MyDomainGalSyncDatasourceID = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(GetDataSourcesResponse, "//admin:GetDataSourcesResponse//admin:dataSource", "id");
            logger.Info("DomainGalSyncDatasourceID=" + MyDomainGalSyncDatasourceID);

            return (true);

        }

        /// <summary>
        /// Create the GAL sync account for this domain
        /// </summary>
        public void createGalSyncAccount()
        {

            // Create the Sync GAL Account
            String galaccount = "galaccount" + HarnessProperties.getUniqueString() + "@" + MyDomainName;
            String datasourcename = "datasource" + HarnessProperties.getUniqueString();


            XmlDocument CreateGalSyncAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                        "<CreateGalSyncAccountRequest xmlns='urn:zimbraAdmin' name='" + datasourcename + "' type='zimbra' domain='" + MyDomainName + "' >"
                    + "<account by='name'>" + galaccount + "</account>"
                    + "<password>" + HarnessProperties.getString("admin.password", "test123") + "</password>"
                    + "</CreateGalSyncAccountRequest>");

            MyDomainGalSyncAccountID = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(CreateGalSyncAccountResponse, "//admin:CreateGalSyncAccountResponse/admin:account", "id");
            logger.Info("DomainGalSyncAccountID=" + MyDomainGalSyncAccountID);


            XmlDocument GetDataSourcesResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                    "<GetDataSourcesRequest xmlns='urn:zimbraAdmin'>"
                + "<id>" + MyDomainGalSyncAccountID + "</id>"
                + "</GetDataSourcesRequest>");

            MyDomainGalSyncDatasourceID = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(GetDataSourcesResponse, "//admin:GetDataSourcesResponse//admin:dataSource", "id");
            logger.Info("DomainGalSyncDatasourceID=" + MyDomainGalSyncDatasourceID);

        }
	
        /// <summary>
        /// Sync the GAL for this domain
        /// </summary>
        public void syncGalAccount()
        {

            // Sync the GAL Account
            XmlDocument SyncGalAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSend(
                        "<SyncGalAccountRequest xmlns='urn:zimbraAdmin'>"
                    + "<account id='" + MyDomainGalSyncAccountID + "'>"
                    + "<datasource by='id' fullSync='true' reset='true'>" + MyDomainGalSyncDatasourceID + "</datasource>"
                    + "</account>"
                    + "</SyncGalAccountRequest>");
            String syncGalAccountResponse = ZimbraAdminAccount.GlobalAdmin.soapSelectValue(SyncGalAccountResponse, "//admin:SyncGalAccountResponse", null);

            if (syncGalAccountResponse == null)
            {
                throw new HarnessException("Unable to sync GAL account.  Response was: " + SyncGalAccountResponse);
            }

        }


    }
}
