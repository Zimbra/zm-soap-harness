using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Utilities;

namespace Zimbra.EasHarness.ActiveSync
{

    /*
     * Example:
     * 
     * http://server:80/Microsoft-Server-ActiveSync?User=name&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=Provision
     * <?xml version="1.0" encoding="utf-8"?>
     * <Provision xmlns="Provision">
     *  <Policies>
     *   <Policy>
     *    <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
     *   </Policy>
     *  </Policies>
     * </Provision>
     * 
     * <?xml version="1.0" encoding="utf-8"?>
     * <Provision xmlns="Provision">
     *  <Status>1</Status>
     *  <Policies>
     *   <Policy>
     *    <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
     *    <Status>1</Status>
     *    <PolicyKey>515234550</PolicyKey>
     *    <Data>
     *     <eas-provisioningdoc>
     *      <DevicePasswordEnabled>0</DevicePasswordEnabled>
     *      <AlphanumericDevicePasswordRequired>0</AlphanumericDevicePasswordRequired>
     *      <PasswordRecoveryEnabled>1</PasswordRecoveryEnabled>
     *      <DeviceEncryptionEnabled>1</DeviceEncryptionEnabled>
     *      <AttachmentsEnabled>1</AttachmentsEnabled>
     *      <MinDevicePasswordLength>4</MinDevicePasswordLength>
     *      <MaxInactivityTimeDeviceLock>900</MaxInactivityTimeDeviceLock>
     *      <MaxDevicePasswordFailedAttempts>4</MaxDevicePasswordFailedAttempts>
     *      <MaxAttachmentSize/>
     *      <AllowSimpleDevicePassword>1</AllowSimpleDevicePassword>
     *      <DevicePasswordExpiration>0</DevicePasswordExpiration>
     *      <DevicePasswordHistory>8</DevicePasswordHistory>
     *      <AllowStorageCard>1</AllowStorageCard>
     *      <AllowCamera>1</AllowCamera>
     *      <RequireDeviceEncryption>0</RequireDeviceEncryption>
     *      <AllowUnsignedApplications>1</AllowUnsignedApplications>
     *      <AllowUnsignedInstallationPackages>1</AllowUnsignedInstallationPackages>
     *      <AllowWiFi>1</AllowWiFi>
     *      <AllowTextMessaging>1</AllowTextMessaging>
     *      <AllowPOPIMAPEmail>1</AllowPOPIMAPEmail>
     *      <AllowBluetooth>2</AllowBluetooth>
     *      <AllowIrDA>1</AllowIrDA>
     *      <RequireManualSyncWhenRoaming>0</RequireManualSyncWhenRoaming>
     *      <AllowDesktopSync>1</AllowDesktopSync>
     *      <MaxCalendarAgeFilter>4</MaxCalendarAgeFilter>
     *      <AllowHTMLEmail>1</AllowHTMLEmail>
     *      <MaxEmailAgeFilter>2</MaxEmailAgeFilter>
     *      <MaxEmailBodyTruncationSize>-1</MaxEmailBodyTruncationSize>
     *      <MaxEmailHTMLBodyTruncationSize>-1</MaxEmailHTMLBodyTruncationSize>
     *      <RequireSignedSMIMEMessages>0</RequireSignedSMIMEMessages>
     *      <RequireEncryptedSMIMEMessages>0</RequireEncryptedSMIMEMessages>
     *      <RequireSignedSMIMEAlgorithm>0</RequireSignedSMIMEAlgorithm>
     *      <RequireEncryptionSMIMEAlgorithm>0</RequireEncryptionSMIMEAlgorithm>
     *      <AllowSMIMEEncryptionAlgorithmNegotiation>1</AllowSMIMEEncryptionAlgorithmNegotiation>
     *      <AllowSMIMESoftCerts>1</AllowSMIMESoftCerts>
     *      <AllowBrowser>1</AllowBrowser>
     *      <AllowConsumerEmail>1</AllowConsumerEmail>
     *      <AllowRemoteDesktop>1</AllowRemoteDesktop>
     *      <AllowInternetSharing>1</AllowInternetSharing>
     *      <UnapprovedInROMApplicationList/>
     *      <ApprovedApplicationList/>
     *     </eas-provisioningdoc>
     *    </Data>
     *   </Policy>
     *  </Policies>
     * </Provision>
     * 
     * 
     * http://server:80/Microsoft-Server-ActiveSync?User=user&DeviceId=ApplDNPHG6NVDT9V&DeviceType=iPhone&Cmd=Provision
     * <?xml version="1.0" encoding="utf-8"?>
     * <Provision xmlns="Provision">
     *  <Policies>
     *   <Policy>
     *    <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
     *    <PolicyKey>515234550</PolicyKey>
     *    <Status>1</Status>
     *   </Policy>
     *  </Policies>
     * </Provision>
     * 
     * 
     * <?xml version="1.0" encoding="utf-8"?>
     * <Provision xmlns="Provision">
     *  <Status>1</Status>
     *  <Policies>
     *   <Policy>
     *    <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
     *    <Status>1</Status>
     *    <PolicyKey>464182075</PolicyKey>
     *   </Policy>
     *  </Policies>
     * </Provision>
     * 
     * 
     */



    public class ZProvisionRequest : ZRequest
    {

        public ZProvisionRequest(ZimbraAccount account)
            : base(account)
        {
            logger.Info("new " + typeof(ZProvisionRequest));

            Command = "Provision";

            // Default payload:
            DestinationPayloadXML =
                @"<?xml version='1.0' encoding='utf-8'?>
                    <Provision xmlns='Provision'>
                        <Policies>
                            <Policy>
                                <PolicyType>MS-EAS-Provisioning-WBXML</PolicyType>
                            </Policy>
                        </Policies>
                    </Provision>";

        }

        public ZProvisionRequest(ZimbraAccount account, String xml)
            : base(account, xml)
        {
            logger.Info("new " + typeof(ZProvisionRequest) + " with payload");

            Command = "Provision";
        }

        public override ZResponse WrapResponse(System.Net.HttpWebResponse response)
        {
            if (response == null)
            {
                return (null);
            }

            return new ZProvisionResponse(response);
        }


    }
}
