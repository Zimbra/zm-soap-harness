/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra MobileSync Automation Test Framework
 * Copyright (C) 2005-2012 VMware, Inc.
 * 
 * Developer: Arindam Bhattacharya
 * 
 * ***** END LICENSE BLOCK *****
 */

using System;
using System.IO;
using System.Xml;
using System.Text;
using System.Collections.Generic;

namespace EASHarness.ActiveSync.WBXML
{
    // List of Global Tokens
    internal enum GlobalTokens
    {
        /**
         * GlobalTokens are the constant field values (in hexadecimal format) required to parse a WBXML stream.
         * See "http://kxml.sourceforge.net/kxml2/javadoc/org/kxml2/wap/Wbxml.html"
         * 
         **/

        SWITCH_PAGE = 0x00,
        END         = 0x01,
        ENTITY      = 0x02,
        STR_I       = 0x03,
        LITERAL     = 0x04,
        EXT_I_0     = 0x40,
        EXT_I_1     = 0x41,
        EXT_I_2     = 0x42,
        PI          = 0x43,
        LITERAL_C   = 0x44,
        EXT_T_0     = 0x80,
        EXT_T_1     = 0x81,
        EXT_T_2     = 0x82,
        STR_T       = 0x83,
        LITERAL_A   = 0x84,
        EXT_0       = 0xC0,
        EXT_1       = 0xC1,
        EXT_2       = 0xC2,
        OPAQUE      = 0xC3,
        LITERAL_AC  = 0xC4,
        
        // Termination Character for a WBXML stream
        TERMNIATOR = 0x00,
        
        // WBXML Version Constants
        WBXML_VERSION_1_1 = 0x01, /* WBXML 1.1 */
        WBXML_VERSION_1_2 = 0x02, /* WBXML 1.2 */
        WBXML_VERSION_1_3 = 0x03, /* WBXML 1.3 */
        
        // Character Set Constants
        WBXML_ENCODING_UTF8 = 0x6A,
        WBXML_ENCODING_ISO_8859_1 = 0x04,
        
        // Unknown Public Identifier
        WBXML_UNKNOWN_PI = 0x01
    }

    static class Namespace
    {
        internal const string AirSync = "AirSync";
        internal const string Contacts = "POOMCONTACTS";
        internal const string Email = "Email";
        internal const string AirNotify = "AirNotify";
        internal const string Calendar = "Calendar";
        internal const string Move = "Move";
        internal const string GetItemEstimate = "GetItemEstimate";
        internal const string FolderHierarchy = "FolderHierarchy";
        internal const string MeetingResponse = "MeetingResponse";
        internal const string Tasks = "Tasks";
        internal const string ResolveRecipients = "ResolveRecipients";
        internal const string ValidateCert = "ValidateCert";
        internal const string Contacts2 = "Contacts2";
        internal const string Ping = "Ping";
        internal const string Provision = "Provision";
        internal const string Search = "Search";
        internal const string GAL = "GAL";
        internal const string AirSyncBase = "AirSyncBase";
        internal const string Settings = "Settings";
        internal const string DocumentLibrary = "DocumentLibrary";
        internal const string ItemOperations = "ItemOperations";
        internal const string ComposeMail = "ComposeMail";
        internal const string Email2 = "Email2";
        internal const string Notes = "Notes";
        internal const string RightsManagement = "RightsManagement";
    }

    static class XmlNS
    {
        internal const string AirSync = "airsync";
        internal const string Contacts = "poomcontacts";
        internal const string Email = "email";
        internal const string AirNotify = "airnotify";
        internal const string Calendar = "calendar";
        internal const string Move = "move";
        internal const string GetItemEstimate = "getitemestimate";
        internal const string FolderHierarchy = "folderhierarchy";
        internal const string MeetingResponse = "meetingresponse";
        internal const string Tasks = "tasks";
        internal const string ResolveRecipients = "resolverecipients";
        internal const string ValidateCert = "validatecert";
        internal const string Contacts2 = "contacts2";
        internal const string Ping = "ping";
        internal const string Provision = "provision";
        internal const string Search = "search";
        internal const string GAL = "gal";
        internal const string AirSyncBase = "airsyncbase";
        internal const string Settings = "settings";
        internal const string DocumentLibrary = "documentlibrary";
        internal const string ItemOperations = "itemoperations";
        internal const string ComposeMail = "composemail";
        internal const string Email2 = "email2";
        internal const string Notes = "notes";
        internal const string RightsManagement = "rightsmanagement";
    }

    // This class impelements a WBXML parser.
    internal class ASWBXML
    {
        /**
         * This class acts as an encoder/decoder and represents an entity for converting between 
         * WBXML Byte Format and XML Document. It also contains the WBXML code pages defined in 
         * the ActiveSync WBXML protocol.
         * 
         * Parsing binary WBXML data requires that the data be read byte-by-byte, with no need to 
         * jump forward or backward in the data (essentially a first-in, first-out scenario). 
         **/

        const byte wbxmlVersion = (byte) GlobalTokens.WBXML_VERSION_1_3;
        const byte publicID = (byte)GlobalTokens.WBXML_UNKNOWN_PI;
        const byte charSet = (byte)GlobalTokens.WBXML_ENCODING_UTF8; // TBD: For automation this should be parameterized
        const byte stringTableLength = (byte)GlobalTokens.TERMNIATOR;

        private XmlDocument xmlDoc = new XmlDocument();
        private ASWBXMLCodePage[] codePage;
        private int currentCodePage = 0;
        private int defaultCodePage = -1;

        internal ASWBXML()
        {
            // Load up codepages
            // Currently there are 25 codepages as per MS-ASWBXML open protocol specifications.
            codePage = new ASWBXMLCodePage[25];

            #region CodePage Initialization
            #region CodePage 0: AirSync
            /**
             * "AirSync CodePage" specifies the codepage for AirSync in the ActiveSync protocol.
             * 
             * CodePage Number == 0x00
             * 
             * Note: ConversationMode, MaxItems & HeartbeatInterval tags are not supported when 
             *       MS-ASProtocolVersion header is set to 12.1
             **/

            codePage[0] = new ASWBXMLCodePage();
            codePage[0].Namespace = "AirSync";
            codePage[0].XmlNS = "airsync";

            codePage[0].SetToken(0x05, "Sync");
            codePage[0].SetToken(0x06, "Responses");
            codePage[0].SetToken(0x07, "Add");
            codePage[0].SetToken(0x08, "Change");
            codePage[0].SetToken(0x09, "Delete");
            codePage[0].SetToken(0x0A, "Fetch");
            codePage[0].SetToken(0x0B, "SyncKey");
            codePage[0].SetToken(0x0C, "ClientId");
            codePage[0].SetToken(0x0D, "ServerId");
            codePage[0].SetToken(0x0E, "Status");
            codePage[0].SetToken(0x0F, "Collection");
            codePage[0].SetToken(0x10, "Class");
            codePage[0].SetToken(0x11, "Version");
            codePage[0].SetToken(0x12, "CollectionId");
            codePage[0].SetToken(0x13, "GetChanges");
            codePage[0].SetToken(0x14, "MoreAvailable");
            codePage[0].SetToken(0x15, "WindowSize");
            codePage[0].SetToken(0x16, "Commands");
            codePage[0].SetToken(0x17, "Options");
            codePage[0].SetToken(0x18, "FilterType");
            codePage[0].SetToken(0x19, "Truncation");
            codePage[0].SetToken(0x1A, "RTFTruncation");
            codePage[0].SetToken(0x1B, "Conflict");
            codePage[0].SetToken(0x1C, "Collections");
            codePage[0].SetToken(0x1D, "ApplicationData");
            codePage[0].SetToken(0x1E, "DeletesAsMoves");
            codePage[0].SetToken(0x1F, "NotifyGUID");
            codePage[0].SetToken(0x20, "Supported");
            codePage[0].SetToken(0x21, "SoftDelete");
            codePage[0].SetToken(0x22, "MIMESupport");
            codePage[0].SetToken(0x23, "MIMETruncation");
            codePage[0].SetToken(0x24, "Wait");
            codePage[0].SetToken(0x25, "Limit");
            codePage[0].SetToken(0x26, "Partial");
            codePage[0].SetToken(0x27, "ConversationMode");
            codePage[0].SetToken(0x28, "MaxItems");
            codePage[0].SetToken(0x29, "HeartbeatInterval");
            #endregion

            #region CodePage 1: Contacts
            /**
             * "Contacts CodePage" specifies the codepage for Contacts in the ActiveSync protocol.
             * 
             * CodePage Number == 0x01
             * 
             * Note: Alias & WeightedRank tags are not supported when the MS-ASProtocolVersion header is set to 12.1
             **/

            codePage[1] = new ASWBXMLCodePage();
            codePage[1].Namespace = "POOMCONTACTS";
            codePage[1].XmlNS = "contacts";

            codePage[1].SetToken(0x05, "Anniversary");
            codePage[1].SetToken(0x06, "AssistantName");
            codePage[1].SetToken(0x07, "AssistantTelephoneNumber");
            codePage[1].SetToken(0x08, "Birthday");
            codePage[1].SetToken(0x09, "Body");
            codePage[1].SetToken(0x0A, "BodySize");
            codePage[1].SetToken(0x0B, "BodyTruncated");
            codePage[1].SetToken(0x0C, "Business2PhoneNumber");
            codePage[1].SetToken(0x0D, "BusinessCity");
            codePage[1].SetToken(0x0E, "BusinessCountry");
            codePage[1].SetToken(0x0F, "BusinessPostalCode");
            codePage[1].SetToken(0x10, "BusinessState");
            codePage[1].SetToken(0x11, "BusinessStreet");
            codePage[1].SetToken(0x12, "BusinessFaxNumber");
            codePage[1].SetToken(0x13, "BusinessPhoneNumber");
            codePage[1].SetToken(0x14, "CarPhoneNumber");
            codePage[1].SetToken(0x15, "Categories");
            codePage[1].SetToken(0x16, "Category");
            codePage[1].SetToken(0x17, "Children");
            codePage[1].SetToken(0x18, "Child");
            codePage[1].SetToken(0x19, "CompanyName");
            codePage[1].SetToken(0x1A, "Department");
            codePage[1].SetToken(0x1B, "Email1Address");
            codePage[1].SetToken(0x1C, "Email2Address");
            codePage[1].SetToken(0x1D, "Email3Address");
            codePage[1].SetToken(0x1E, "FileAs");
            codePage[1].SetToken(0x1F, "FirstName");
            codePage[1].SetToken(0x20, "Home2PhoneNumber");
            codePage[1].SetToken(0x21, "HomeCity");
            codePage[1].SetToken(0x22, "HomeCountry");
            codePage[1].SetToken(0x23, "HomePostalCode");
            codePage[1].SetToken(0x24, "HomeState");
            codePage[1].SetToken(0x25, "HomeStreet");
            codePage[1].SetToken(0x26, "HomeFaxNumber");
            codePage[1].SetToken(0x27, "HomePhoneNumber");
            codePage[1].SetToken(0x28, "JobTitle");
            codePage[1].SetToken(0x29, "LastName");
            codePage[1].SetToken(0x2A, "MiddleName");
            codePage[1].SetToken(0x2B, "MobilePhoneNumber");
            codePage[1].SetToken(0x2C, "OfficeLocation");
            codePage[1].SetToken(0x2D, "OtherCity");
            codePage[1].SetToken(0x2E, "OtherCountry");
            codePage[1].SetToken(0x2F, "OtherPostalCode");
            codePage[1].SetToken(0x30, "OtherState");
            codePage[1].SetToken(0x31, "OtherStreet");
            codePage[1].SetToken(0x32, "PagerNumber");
            codePage[1].SetToken(0x33, "RadioPhoneNumber");
            codePage[1].SetToken(0x34, "Spouse");
            codePage[1].SetToken(0x35, "Suffix");
            codePage[1].SetToken(0x36, "Title");
            codePage[1].SetToken(0x37, "Webpage");
            codePage[1].SetToken(0x38, "YomiCompanyName");
            codePage[1].SetToken(0x39, "YomiFirstName");
            codePage[1].SetToken(0x3A, "YomiLastName");
            codePage[1].SetToken(0x3B, "CompressedRTF");
            codePage[1].SetToken(0x3C, "Picture");
            codePage[1].SetToken(0x3D, "Alias");
            codePage[1].SetToken(0x3E, "WeightedRank");
            #endregion

            #region CodePage 2: Email
            /**
             * "Email CodePage" specifies the codepage for Email in the ActiveSync protocol.
             * 
             * CodePage Number == 0x02
             * 
             * Note: Categories, Category & DisallowNewTimeProposal tags are not supported when the 
             *       MS-ASProtocolVersion header is set to 12.1
             **/

            codePage[2] = new ASWBXMLCodePage();
            codePage[2].Namespace = "Email";
            codePage[2].XmlNS = "email";

            codePage[2].SetToken(0x05, "Attachment");
            codePage[2].SetToken(0x06, "Attachments");
            codePage[2].SetToken(0x07, "AttName");
            codePage[2].SetToken(0x08, "AttSize");
            codePage[2].SetToken(0x09, "AttId"); // TBD: Could be "Att0Id" so change during debugging
            codePage[2].SetToken(0x0A, "AttMethod");
            codePage[2].SetToken(0x0B, "AttRemoved");
            codePage[2].SetToken(0x0C, "Body");
            codePage[2].SetToken(0x0D, "BodySize");
            codePage[2].SetToken(0x0E, "BodyTruncated");
            codePage[2].SetToken(0x0F, "DateReceived");
            codePage[2].SetToken(0x10, "DisplayName");
            codePage[2].SetToken(0x11, "DisplayTo");
            codePage[2].SetToken(0x12, "Importance");
            codePage[2].SetToken(0x13, "MessageClass");
            codePage[2].SetToken(0x14, "Subject");
            codePage[2].SetToken(0x15, "Read");
            codePage[2].SetToken(0x16, "To");
            codePage[2].SetToken(0x17, "CC");
            codePage[2].SetToken(0x18, "From");
            codePage[2].SetToken(0x19, "ReplyTo");
            codePage[2].SetToken(0x1A, "AllDayEvent");
            codePage[2].SetToken(0x1B, "Categories");
            codePage[2].SetToken(0x1C, "Category");
            codePage[2].SetToken(0x1D, "DTStamp");
            codePage[2].SetToken(0x1E, "EndTime");
            codePage[2].SetToken(0x1F, "InstanceType");
            codePage[2].SetToken(0x20, "BusyStatus");
            codePage[2].SetToken(0x21, "Location");
            codePage[2].SetToken(0x22, "MeetingRequest");
            codePage[2].SetToken(0x23, "Organizer");
            codePage[2].SetToken(0x24, "RecurrenceId");
            codePage[2].SetToken(0x25, "Reminder");
            codePage[2].SetToken(0x26, "ResponseRequested");
            codePage[2].SetToken(0x27, "Recurrences");
            codePage[2].SetToken(0x28, "Recurrence");
            codePage[2].SetToken(0x29, "Recurrence_Type");
            codePage[2].SetToken(0x2A, "Recurrence_Until");
            codePage[2].SetToken(0x2B, "Recurrence_Occurrences");
            codePage[2].SetToken(0x2C, "Recurrence_Interval");
            codePage[2].SetToken(0x2D, "Recurrence_DayOfWeek");
            codePage[2].SetToken(0x2E, "Recurrence_DayOfMonth");
            codePage[2].SetToken(0x2F, "Recurrence_WeekOfMonth");
            codePage[2].SetToken(0x30, "Recurrence_MonthOfYear");
            codePage[2].SetToken(0x31, "StartTime");
            codePage[2].SetToken(0x32, "Sensitivity");
            codePage[2].SetToken(0x33, "TimeZone");
            codePage[2].SetToken(0x34, "GlobalObjId");
            codePage[2].SetToken(0x35, "ThreadTopic");
            codePage[2].SetToken(0x36, "MIMEData");
            codePage[2].SetToken(0x37, "MIMETruncated");
            codePage[2].SetToken(0x38, "MIMESize");
            codePage[2].SetToken(0x39, "InternetCPID");
            codePage[2].SetToken(0x3A, "Flag");
            codePage[2].SetToken(0x3B, "FlagStatus");
            codePage[2].SetToken(0x3C, "ContentClass");
            codePage[2].SetToken(0x3D, "FlagType");
            codePage[2].SetToken(0x3E, "CompleteTime");
            codePage[2].SetToken(0x3F, "DisallowNewTimeProposal");

            #endregion

            #region CodePage 3: AirNotify
            /**
             * "AirNotify CodePage" specifies the codepage for AirNotify in the ActiveSync protocol.
             * 
             * CodePage Number == 0x03
             * 
             * Note: This codepage is no longer used ("http://msdn.microsoft.com/en-us/library/ee160829(v=EXCHG.80).aspx")
             **/

            codePage[3] = new ASWBXMLCodePage();
            codePage[3].Namespace = "AirNotify";
            codePage[3].XmlNS = "airnotify";

            codePage[3].SetToken(0x05, "Notify");
            codePage[3].SetToken(0x06, "Notification");
            codePage[3].SetToken(0x07, "Version");
            codePage[3].SetToken(0x08, "LifeTime");
            codePage[3].SetToken(0x09, "DeviceInfo");
            codePage[3].SetToken(0x0A, "Enable");
            codePage[3].SetToken(0x0B, "Folder");
            codePage[3].SetToken(0x0C, "ServerId");
            codePage[3].SetToken(0x0D, "DeviceAddress");
            codePage[3].SetToken(0x0E, "ValidCarrierProfiles");
            codePage[3].SetToken(0x0F, "CarrierProfile");
            codePage[3].SetToken(0x10, "Status");
            codePage[3].SetToken(0x11, "Responses");
            codePage[3].SetToken(0x12, "Devices");
            codePage[3].SetToken(0x13, "Device");
            codePage[3].SetToken(0x14, "Id");
            codePage[3].SetToken(0x15, "Expiry");
            codePage[3].SetToken(0x16, "NotifyGUID");
            codePage[3].SetToken(0x17, "DeviceFriendlyName");
            #endregion

            #region CodePage 4: Calendar
            /**
             * "Calendar CodePage" specifies the codepage for Calendar in the ActiveSync protocol.
             * 
             * CodePage Number == 0x04
             * 
             * Note:
             * 1. DisallowNewTimeProposal, ResponseRequested, AppointmentReplyTime, ResponseType, 
             *    CalendarType & IsLeapMonth tags are not supported when the MS-ASProtocolVersion 
             *    header is set to 12.1 
             * 2. FirstDayOfWeek, OnlineMeetingConfLink & OnlineMeetingExternalLink tags are not 
             *    supported when the MS-ASProtocolVersion header is set to 12.1 or 14.0
             * 
             **/

            codePage[4] = new ASWBXMLCodePage();
            codePage[4].Namespace = "Calendar";
            codePage[4].XmlNS = "calendar";

            codePage[4].SetToken(0x05, "TimeZone");
            codePage[4].SetToken(0x06, "AllDayEvent");
            codePage[4].SetToken(0x07, "Attendees");
            codePage[4].SetToken(0x08, "Attendee");
            codePage[4].SetToken(0x09, "Attendee_Email");
            codePage[4].SetToken(0x0A, "Attendee_Name");
            codePage[4].SetToken(0x0B, "Body");
            codePage[4].SetToken(0x0C, "BodyTruncated");
            codePage[4].SetToken(0x0D, "BusyStatus");
            codePage[4].SetToken(0x0E, "Categories");
            codePage[4].SetToken(0x0F, "Category");
            codePage[4].SetToken(0x10, "Compressed_RTF");
            codePage[4].SetToken(0x11, "DTStamp");
            codePage[4].SetToken(0x12, "EndTime");
            codePage[4].SetToken(0x13, "Exception");
            codePage[4].SetToken(0x14, "Exceptions");
            codePage[4].SetToken(0x15, "Exception_Deleted");
            codePage[4].SetToken(0x16, "Exception_StartTime");
            codePage[4].SetToken(0x17, "Location");
            codePage[4].SetToken(0x18, "MeetingStatus");
            codePage[4].SetToken(0x19, "Organizer_Email");
            codePage[4].SetToken(0x1A, "Organizer_Name");
            codePage[4].SetToken(0x1B, "Recurrence");
            codePage[4].SetToken(0x1C, "Recurrence_Type");
            codePage[4].SetToken(0x1D, "Recurrence_Until");
            codePage[4].SetToken(0x1E, "Recurrence_Occurrences");
            codePage[4].SetToken(0x1F, "Recurrence_Interval");
            codePage[4].SetToken(0x20, "Recurrence_DayOfWeek");
            codePage[4].SetToken(0x21, "Recurrence_DayOfMonth");
            codePage[4].SetToken(0x22, "Recurrence_WeekOfMonth");
            codePage[4].SetToken(0x23, "Recurrence_MonthOfYear");
            codePage[4].SetToken(0x24, "Reminder");
            codePage[4].SetToken(0x25, "Sensitivity");
            codePage[4].SetToken(0x26, "Subject");
            codePage[4].SetToken(0x27, "StartTime");
            codePage[4].SetToken(0x28, "UID");
            codePage[4].SetToken(0x29, "Attendee_Status");
            codePage[4].SetToken(0x2A, "Attendee_Type");
            codePage[4].SetToken(0x33, "DisallowNewTimeProposal");
            codePage[4].SetToken(0x34, "ResponseRequested");
            codePage[4].SetToken(0x35, "AppointmentReplyTime");
            codePage[4].SetToken(0x36, "ResponseType");
            codePage[4].SetToken(0x37, "CalendarType");
            codePage[4].SetToken(0x38, "IsLeapMonth");
            codePage[4].SetToken(0x39, "FirstDayOfWeek");
            codePage[4].SetToken(0x3A, "OnlineMeetingConfLink");
            codePage[4].SetToken(0x3B, "OnlineMeetingExternalLink");
            #endregion

            #region CodePage 5: Move
            /**
             * "Move CodePage" specifies the codepage for Move in the ActiveSync protocol.
             * 
             * CodePage Number == 0x05
             **/

            codePage[5] = new ASWBXMLCodePage();
            codePage[5].Namespace = "Move";
            codePage[5].XmlNS = "move";

            codePage[5].SetToken(0x05, "MoveItems");
            codePage[5].SetToken(0x06, "Move");
            codePage[5].SetToken(0x07, "SrcMsgId");
            codePage[5].SetToken(0x08, "SrcFldId");
            codePage[5].SetToken(0x09, "DstFldId");
            codePage[5].SetToken(0x0A, "Response");
            codePage[5].SetToken(0x0B, "Status");
            codePage[5].SetToken(0x0C, "DstMsgId");
            #endregion

            #region CodePage 6: ItemEstimate
            /**
             * "ItemEstimate CodePage" specifies the codepage for item estimates in the ActiveSync protocol.
             * 
             * CodePage Number == 0x06
             * 
             * Note:
             * 1. Version, Class & DateTime tags are only supported when the MS-ASProtocolVersion header is set to 12.1 
             * 2. If the Class tag is defined in a codepage then "0" should be used in all other instances.
             **/

            codePage[6] = new ASWBXMLCodePage();
            codePage[6].Namespace = "GetItemEstimate";
            codePage[6].XmlNS = "getitemestimate";

            codePage[6].SetToken(0x05, "GetItemEstimate");
            codePage[6].SetToken(0x06, "Version");
            codePage[6].SetToken(0x07, "Collections");
            codePage[6].SetToken(0x08, "Collection");
            codePage[6].SetToken(0x09, "Class");
            codePage[6].SetToken(0x0A, "CollectionId");
            codePage[6].SetToken(0x0B, "DateTime");
            codePage[6].SetToken(0x0C, "Estimate");
            codePage[6].SetToken(0x0D, "Response");
            codePage[6].SetToken(0x0E, "Status");
            #endregion

            #region CodePage 7: FolderHierarchy
            /**
             * "FolderHierarchy CodePage" specifies the codepage for folder hierarchy in the ActiveSync protocol.
             * 
             * CodePage Number == 0x07
             **/

            codePage[7] = new ASWBXMLCodePage();
            codePage[7].Namespace = "FolderHierarchy";
            codePage[7].XmlNS = "folderhierarchy";

            codePage[7].SetToken(0x05, "Folders");
            codePage[7].SetToken(0x06, "Folder");
            codePage[7].SetToken(0x07, "DisplayName");
            codePage[7].SetToken(0x08, "ServerId");
            codePage[7].SetToken(0x09, "ParentId");
            codePage[7].SetToken(0x0A, "Type");
            codePage[7].SetToken(0x0B, "Response");
            codePage[7].SetToken(0x0C, "Status");
            codePage[7].SetToken(0x0D, "ContentClass");
            codePage[7].SetToken(0x0E, "Changes");
            codePage[7].SetToken(0x0F, "Add");
            codePage[7].SetToken(0x10, "Delete");
            codePage[7].SetToken(0x11, "Update");
            codePage[7].SetToken(0x12, "SyncKey");
            codePage[7].SetToken(0x13, "FolderCreate");
            codePage[7].SetToken(0x14, "FolderDelete");
            codePage[7].SetToken(0x15, "FolderUpdate");
            codePage[7].SetToken(0x16, "FolderSync");
            codePage[7].SetToken(0x17, "Count");
            codePage[7].SetToken(0x18, "Version");
            #endregion

            #region CodePage 8: MeetingResponse
            /**
             * "MeetingResponse CodePage" specifies the codepage for meeting responses in the ActiveSync protocol.
             * 
             * CodePage Number == 0x08
             **/

            codePage[8] = new ASWBXMLCodePage();
            codePage[8].Namespace = "MeetingResponse";
            codePage[8].XmlNS = "meetingresponse";

            codePage[8].SetToken(0x05, "CalendarId");
            codePage[8].SetToken(0x06, "CollectionId");
            codePage[8].SetToken(0x07, "MeetingResponse");
            codePage[8].SetToken(0x08, "RequestId");
            codePage[8].SetToken(0x09, "Request");
            codePage[8].SetToken(0x0A, "Result");
            codePage[8].SetToken(0x0B, "Status");
            codePage[8].SetToken(0x0C, "UserResponse");
            codePage[8].SetToken(0x0D, "Version");
            codePage[8].SetToken(0x0E, "InstanceId");
            #endregion

            #region CodePage 9: Tasks
            /**
             * "Tasks CodePage" specifies the codepage for tasks in the ActiveSync protocol.
             * 
             * CodePage Number == 0x09
             * 
             * Note:
             * 1. CalendarType & IsLeapMonth tags are not supported when the MS-ASProtocolVersion header is set to 12.1 
             * 2. FirstDayOfWeek tag is not supported when the MS-ASProtocolVersion header is set to 12.1 or 14.0
             **/

            codePage[9] = new ASWBXMLCodePage();
            codePage[9].Namespace = "Tasks";
            codePage[9].XmlNS = "tasks";

            codePage[9].SetToken(0x05, "Body");
            codePage[9].SetToken(0x06, "BodySize");
            codePage[9].SetToken(0x07, "BodyTruncated");
            codePage[9].SetToken(0x08, "Categories");
            codePage[9].SetToken(0x09, "Category");
            codePage[9].SetToken(0x0A, "Complete");
            codePage[9].SetToken(0x0B, "DateCompleted");
            codePage[9].SetToken(0x0C, "DueDate");
            codePage[9].SetToken(0x0D, "UTCDueDate");
            codePage[9].SetToken(0x0E, "Importance");
            codePage[9].SetToken(0x0F, "Recurrence");
            codePage[9].SetToken(0x10, "Recurrence_Type");
            codePage[9].SetToken(0x11, "Recurrence_Start");
            codePage[9].SetToken(0x12, "Recurrence_Until");
            codePage[9].SetToken(0x13, "Recurrence_Occurrences");
            codePage[9].SetToken(0x14, "Recurrence_Interval");
            codePage[9].SetToken(0x15, "Recurrence_DayOfMonth");
            codePage[9].SetToken(0x16, "Recurrence_DayOfWeek");
            codePage[9].SetToken(0x17, "Recurrence_WeekOfMonth");
            codePage[9].SetToken(0x18, "Recurrence_MonthOfYear");
            codePage[9].SetToken(0x19, "Recurrence_Regenerate");
            codePage[9].SetToken(0x1A, "Recurrence_DeadOccur");
            codePage[9].SetToken(0x1B, "ReminderSet");
            codePage[9].SetToken(0x1C, "ReminderTime");
            codePage[9].SetToken(0x1D, "Sensitivity");
            codePage[9].SetToken(0x1E, "StartDate");
            codePage[9].SetToken(0x1F, "UTCStartDate");
            codePage[9].SetToken(0x20, "Subject");
            codePage[9].SetToken(0x21, "CompressedRTF");
            codePage[9].SetToken(0x22, "OrdinalDate");
            codePage[9].SetToken(0x23, "SubOrdinalDate");
            codePage[9].SetToken(0x24, "CalendarType");
            codePage[9].SetToken(0x25, "IsLeapMonth");
            codePage[9].SetToken(0x26, "FirstDayOfWeek");
            #endregion

            #region CodePage 10: ResolveRecipients
            /**
             * "ResolveRecipients CodePage" specifies the codepage for resolve recipients in the ActiveSync protocol.
             * 
             * CodePage Number == 0x0A
             * 
             * Note:
             * 1. Availability, StartTime, EndTime & MergedFreeBusy tags are not supported when the MS-ASProtocolVersion 
             *    header is set to 12.1
             * 2. Picture, MaxSize, Data & MaxPictures tags are not supported when the MS-ASProtocolVersion header is set 
             *    to 12.1 or 14.0
             **/

            codePage[10] = new ASWBXMLCodePage();
            codePage[10].Namespace = "ResolveRecipients";
            codePage[10].XmlNS = "resolverecipients";

            codePage[10].SetToken(0x05, "ResolveRecipients");
            codePage[10].SetToken(0x06, "Response");
            codePage[10].SetToken(0x07, "Status");
            codePage[10].SetToken(0x08, "Type");
            codePage[10].SetToken(0x09, "Recipient");
            codePage[10].SetToken(0x0A, "DisplayName");
            codePage[10].SetToken(0x0B, "EmailAddress");
            codePage[10].SetToken(0x0C, "Certificates");
            codePage[10].SetToken(0x0D, "Certificate");
            codePage[10].SetToken(0x0E, "MiniCertificate");
            codePage[10].SetToken(0x0F, "Options");
            codePage[10].SetToken(0x10, "To");
            codePage[10].SetToken(0x11, "CertificateRetrieval");
            codePage[10].SetToken(0x12, "RecipientCount");
            codePage[10].SetToken(0x13, "MaxCertificates");
            codePage[10].SetToken(0x14, "MaxAmbiguousRecipients");
            codePage[10].SetToken(0x15, "CertificateCount");
            codePage[10].SetToken(0x16, "Availability");
            codePage[10].SetToken(0x17, "StartTime");
            codePage[10].SetToken(0x18, "EndTime");
            codePage[10].SetToken(0x19, "MergedFreeBusy");
            codePage[10].SetToken(0x1A, "Picture");
            codePage[10].SetToken(0x1B, "MaxSize");
            codePage[10].SetToken(0x1C, "Data");
            codePage[10].SetToken(0x1D, "MaxPictures");
            #endregion

            #region CodePage 11: ValidateCert
            /**
             * "ValidateCert CodePage" specifies the codepage for validating certifictes in the ActiveSync protocol.
             * 
             * CodePage Number == 0x0B
             **/

            codePage[11] = new ASWBXMLCodePage();
            codePage[11].Namespace = "ValidateCert";
            codePage[11].XmlNS = "validatecert";

            codePage[11].SetToken(0x05, "ValidateCert");
            codePage[11].SetToken(0x06, "Certificates");
            codePage[11].SetToken(0x07, "Certificate");
            codePage[11].SetToken(0x08, "CertificateChain");
            codePage[11].SetToken(0x09, "CheckCRL");
            codePage[11].SetToken(0x0A, "Status");
            #endregion

            #region CodePage 12: Contacts2
            /**
             * "Contacts2 CodePage" specifies the codepage for Contacts2 in the ActiveSync protocol.
             * 
             * CodePage Number == 0x0C
             **/

            codePage[12] = new ASWBXMLCodePage();
            codePage[12].Namespace = "Contacts2";
            codePage[12].XmlNS = "contacts2";

            codePage[12].SetToken(0x05, "CustomerId");
            codePage[12].SetToken(0x06, "GovernmentId");
            codePage[12].SetToken(0x07, "IMAddress");
            codePage[12].SetToken(0x08, "IMAddress2");
            codePage[12].SetToken(0x09, "IMAddress3");
            codePage[12].SetToken(0x0A, "ManagerName");
            codePage[12].SetToken(0x0B, "CompanyMainPhone");
            codePage[12].SetToken(0x0C, "AccountName");
            codePage[12].SetToken(0x0D, "NickName");
            codePage[12].SetToken(0x0E, "MMS");
            #endregion

            #region CodePage 13: Ping
            /**
             * "Ping CodePage" specifies the codepage for ping in the ActiveSync protocol.
             * 
             * CodePage Number == 0x0D
             * 
             * Note: Per MS-ASWBXML, this tag is not used by protocol
             **/

            codePage[13] = new ASWBXMLCodePage();
            codePage[13].Namespace = "Ping";
            codePage[13].XmlNS = "ping";

            codePage[13].SetToken(0x05, "Ping");
            codePage[13].SetToken(0x06, "AutdState");
            codePage[13].SetToken(0x07, "Status");
            codePage[13].SetToken(0x08, "HeartbeatInterval");
            codePage[13].SetToken(0x09, "Folders");
            codePage[13].SetToken(0x0A, "Folder");
            codePage[13].SetToken(0x0B, "Id");
            codePage[13].SetToken(0x0C, "Class");
            codePage[13].SetToken(0x0D, "MaxFolders");
            #endregion

            #region CodePage 14: Provision
            /**
             * "Provision CodePage" specifies the codepage for provision in the ActiveSync protocol.
             * 
             * CodePage Number == 0x0E
             **/

            codePage[14] = new ASWBXMLCodePage();
            codePage[14].Namespace = "Provision";
            codePage[14].XmlNS = "provision";

            codePage[14].SetToken(0x05, "Provision");
            codePage[14].SetToken(0x06, "Policies");
            codePage[14].SetToken(0x07, "Policy");
            codePage[14].SetToken(0x08, "PolicyType");
            codePage[14].SetToken(0x09, "PolicyKey");
            codePage[14].SetToken(0x0A, "Data");
            codePage[14].SetToken(0x0B, "Status");
            codePage[14].SetToken(0x0C, "RemoteWipe");
            codePage[14].SetToken(0x0D, "EASProvisionDoc");
            codePage[14].SetToken(0x0E, "DevicePasswordEnabled");
            codePage[14].SetToken(0x0F, "AlphanumericDevicePasswordRequired");
            codePage[14].SetToken(0x10, "RequireStorageCardEncryption");
            codePage[14].SetToken(0x11, "PasswordRecoveryEnabled");
            codePage[14].SetToken(0x12, "DocumentBrowseEnabled");
            codePage[14].SetToken(0x13, "AttachmentsEnabled");
            codePage[14].SetToken(0x14, "MinDevicePasswordLength");
            codePage[14].SetToken(0x15, "MaxInactivityTimeDeviceLock");
            codePage[14].SetToken(0x16, "MaxDevicePasswordFailedAttempts");
            codePage[14].SetToken(0x17, "MaxAttachmentSize");
            codePage[14].SetToken(0x18, "AllowSimpleDevicePassword");
            codePage[14].SetToken(0x19, "DevicePasswordExpiration");
            codePage[14].SetToken(0x1A, "DevicePasswordHistory");
            codePage[14].SetToken(0x1B, "AllowStorageCard");
            codePage[14].SetToken(0x1C, "AllowCamera");
            codePage[14].SetToken(0x1D, "RequireDeviceEncryption");
            codePage[14].SetToken(0x1E, "AllowUnsignedApplications");
            codePage[14].SetToken(0x1F, "AllowUnsignedInstallationPackages");
            codePage[14].SetToken(0x20, "MinDevicePasswordComplexCharacters");
            codePage[14].SetToken(0x21, "AllowWiFi");
            codePage[14].SetToken(0x22, "AllowTextMessaging");
            codePage[14].SetToken(0x23, "AllowPOPIMAPEmail");
            codePage[14].SetToken(0x24, "AllowBluetooth");
            codePage[14].SetToken(0x25, "AllowIrDA");
            codePage[14].SetToken(0x26, "RequireManualSyncWhenRoaming");
            codePage[14].SetToken(0x27, "AllowDesktopSync");
            codePage[14].SetToken(0x28, "MaxCalendarAgeFilter");
            codePage[14].SetToken(0x29, "AllowHTMLEmail");
            codePage[14].SetToken(0x2A, "MaxEmailAgeFilter");
            codePage[14].SetToken(0x2B, "MaxEmailBodyTruncationSize");
            codePage[14].SetToken(0x2C, "MaxEmailHTMLBodyTruncationSize");
            codePage[14].SetToken(0x2D, "RequireSignedSMIMEMessages");
            codePage[14].SetToken(0x2E, "RequireEncryptedSMIMEMessages");
            codePage[14].SetToken(0x2F, "RequireSignedSMIMEAlgorithm");
            codePage[14].SetToken(0x30, "RequireEncryptionSMIMEAlgorithm");
            codePage[14].SetToken(0x31, "AllowSMIMEEncryptionAlgorithmNegotiation");
            codePage[14].SetToken(0x32, "AllowSMIMESoftCerts");
            codePage[14].SetToken(0x33, "AllowBrowser");
            codePage[14].SetToken(0x34, "AllowConsumerEmail");
            codePage[14].SetToken(0x35, "AllowRemoteDesktop");
            codePage[14].SetToken(0x36, "AllowInternetSharing");
            codePage[14].SetToken(0x37, "UnapprovedInROMApplicationList");
            codePage[14].SetToken(0x38, "ApplicationName");
            codePage[14].SetToken(0x39, "ApprovedApplicationList");
            codePage[14].SetToken(0x3A, "Hash");
            #endregion

            #region CodePage 15: Search
            /**
             * "Search CodePage" specifies the codepage for search in the ActiveSync protocol.
             * 
             * CodePage Number == 0x0F
             * 
             * Note:
             * 1. Or tag is not supported when the MS-ASProtocolVersion header is set to 12.1  
             * 2. Picture, MaxSize & MaxPictures tags are not supported when the MS-ASProtocolVersion 
             *    header is set to 12.1 or 14.0
             **/

            codePage[15] = new ASWBXMLCodePage();
            codePage[15].Namespace = "Search";
            codePage[15].XmlNS = "search";

            codePage[15].SetToken(0x05, "Search");
            codePage[15].SetToken(0x07, "Store");
            codePage[15].SetToken(0x08, "Name");
            codePage[15].SetToken(0x09, "Query");
            codePage[15].SetToken(0x0A, "Options");
            codePage[15].SetToken(0x0B, "Range");
            codePage[15].SetToken(0x0C, "Status");
            codePage[15].SetToken(0x0D, "Response");
            codePage[15].SetToken(0x0E, "Result");
            codePage[15].SetToken(0x0F, "Properties");
            codePage[15].SetToken(0x10, "Total");
            codePage[15].SetToken(0x11, "EqualTo");
            codePage[15].SetToken(0x12, "Value");
            codePage[15].SetToken(0x13, "And");
            codePage[15].SetToken(0x14, "Or");
            codePage[15].SetToken(0x15, "FreeText");
            codePage[15].SetToken(0x17, "DeepTraversal");
            codePage[15].SetToken(0x18, "LongId");
            codePage[15].SetToken(0x19, "RebuildResults");
            codePage[15].SetToken(0x1A, "LessThan");
            codePage[15].SetToken(0x1B, "GreaterThan");
            codePage[15].SetToken(0x1C, "Schema");
            codePage[15].SetToken(0x1D, "Supported");
            codePage[15].SetToken(0x1E, "UserName");
            codePage[15].SetToken(0x1F, "Password");
            codePage[15].SetToken(0x20, "ConversationId");
            codePage[15].SetToken(0x21, "Picture");
            codePage[15].SetToken(0x22, "MaxSize");
            codePage[15].SetToken(0x23, "MaxPictures");
            #endregion

            #region CodePage 16: GAL
            /**
             * "GAL CodePage" specifies the codepage for gal in the ActiveSync protocol.
             * 
             * CodePage Number == 0x10
             * 
             * Note: Picture, Status & Data tags are not supported when the MS-ASProtocolVersion 
             *       header is set to 12.1 or 14.0
             **/

            codePage[16] = new ASWBXMLCodePage();
            codePage[16].Namespace = "GAL";
            codePage[16].XmlNS = "gal";

            codePage[16].SetToken(0x05, "DisplayName");
            codePage[16].SetToken(0x06, "Phone");
            codePage[16].SetToken(0x07, "Office");
            codePage[16].SetToken(0x08, "Title");
            codePage[16].SetToken(0x09, "Company");
            codePage[16].SetToken(0x0A, "Alias");
            codePage[16].SetToken(0x0B, "FirstName");
            codePage[16].SetToken(0x0C, "LastName");
            codePage[16].SetToken(0x0D, "HomePhone");
            codePage[16].SetToken(0x0E, "MobilePhone");
            codePage[16].SetToken(0x0F, "EmailAddress");
            codePage[16].SetToken(0x10, "Picture");
            codePage[16].SetToken(0x11, "Status");
            codePage[16].SetToken(0x12, "Data");
            #endregion

            #region CodePage 17: AirSyncBase
            /**
             * "AirSyncBase CodePage" specifies the codepage for AirSyncBase in the ActiveSync protocol.
             * 
             * CodePage Number == 0x11
             * 
             * Note: 
             * 1. ContentLocation tag is not used by the protocol. 
             * 2. Preview tag is not supported when the MS-ASProtocolVersion header is set to 12.1.
             * 3. BodyPartPreference, BodyPart & Status tags are not supported when the MS-ASProtocolVersion 
             *    header is set to 12.1 or 14.0 
             **/

            codePage[17] = new ASWBXMLCodePage();
            codePage[17].Namespace = "AirSyncBase";
            codePage[17].XmlNS = "airsyncbase";

            codePage[17].SetToken(0x05, "BodyPreference");
            codePage[17].SetToken(0x06, "Type");
            codePage[17].SetToken(0x07, "TruncationSize");
            codePage[17].SetToken(0x08, "AllOrNone");
            codePage[17].SetToken(0x0A, "Body");
            codePage[17].SetToken(0x0B, "Data");
            codePage[17].SetToken(0x0C, "EstimatedDataSize");
            codePage[17].SetToken(0x0D, "Truncated");
            codePage[17].SetToken(0x0E, "Attachments");
            codePage[17].SetToken(0x0F, "Attachment");
            codePage[17].SetToken(0x10, "DisplayName");
            codePage[17].SetToken(0x11, "FileReference");
            codePage[17].SetToken(0x12, "Method");
            codePage[17].SetToken(0x13, "ContentId");
            codePage[17].SetToken(0x14, "ContentLocation");
            codePage[17].SetToken(0x15, "IsInline");
            codePage[17].SetToken(0x16, "NativeBodyType");
            codePage[17].SetToken(0x17, "ContentType");
            codePage[17].SetToken(0x18, "Preview");
            codePage[17].SetToken(0x19, "BodyPartPreference");
            codePage[17].SetToken(0x1A, "BodyPart");
            codePage[17].SetToken(0x1B, "Status");
            #endregion

            #region CodePage 18: Settings
            /**
             * "Settings CodePage" specifies the codepage for settings in the ActiveSync protocol.
             * 
             * CodePage Number == 0x12
             * 
             * Note: 
             * 1. EnableOutboundSMS & MobileOperator tags are not supported when the MS-ASProtocolVersion 
             *    header is set to 12.1. 
             * 2. PrimarySmtpAddress, Accounts, Account, AccountId, AccountName, UserDisplayName, SendDisabled & 
             *    ihsManagementInformation tags are not supported when the MS-ASProtocolVersion header is set to 
             *    12.1 or 14.0  
             **/

            codePage[18] = new ASWBXMLCodePage();
            codePage[18].Namespace = "Settings";
            codePage[18].XmlNS = "settings";

            codePage[18].SetToken(0x05, "Settings");
            codePage[18].SetToken(0x06, "Status");
            codePage[18].SetToken(0x07, "Get");
            codePage[18].SetToken(0x08, "Set");
            codePage[18].SetToken(0x09, "Oof");
            codePage[18].SetToken(0x0A, "OofState");
            codePage[18].SetToken(0x0B, "StartTime");
            codePage[18].SetToken(0x0C, "EndTime");
            codePage[18].SetToken(0x0D, "OofMessage");
            codePage[18].SetToken(0x0E, "AppliesToInternal");
            codePage[18].SetToken(0x0F, "AppliesToExternalKnown");
            codePage[18].SetToken(0x10, "AppliesToExternalUnknown");
            codePage[18].SetToken(0x11, "Enabled");
            codePage[18].SetToken(0x12, "ReplyMessage");
            codePage[18].SetToken(0x13, "BodyType");
            codePage[18].SetToken(0x14, "DevicePassword");
            codePage[18].SetToken(0x15, "Password");
            codePage[18].SetToken(0x16, "DeviceInformation");
            codePage[18].SetToken(0x17, "Model");
            codePage[18].SetToken(0x18, "IMEI");
            codePage[18].SetToken(0x19, "FriendlyName");
            codePage[18].SetToken(0x1A, "OS");
            codePage[18].SetToken(0x1B, "OSLanguage");
            codePage[18].SetToken(0x1C, "PhoneNumber");
            codePage[18].SetToken(0x1D, "UserInformation");
            codePage[18].SetToken(0x1E, "EmailAddresses");
            codePage[18].SetToken(0x1F, "SmtpAddress");
            codePage[18].SetToken(0x20, "UserAgent");
            codePage[18].SetToken(0x21, "EnableOutboundSMS");
            codePage[18].SetToken(0x22, "MobileOperator");
            codePage[18].SetToken(0x23, "PrimarySmtpAddress");
            codePage[18].SetToken(0x24, "Accounts");
            codePage[18].SetToken(0x25, "Account");
            codePage[18].SetToken(0x26, "AccountId");
            codePage[18].SetToken(0x27, "AccountName");
            codePage[18].SetToken(0x28, "UserDisplayName");
            codePage[18].SetToken(0x29, "SendDisabled");
            codePage[18].SetToken(0x2B, "ihsManagementInformation");
            #endregion

            #region CodePage 19: DocumentLibrary
            /**
             * "DocumentLibrary CodePage" specifies the codepage for document library in the ActiveSync protocol.
             * 
             * CodePage Number == 0x13
             **/

            codePage[19] = new ASWBXMLCodePage();
            codePage[19].Namespace = "DocumentLibrary";
            codePage[19].XmlNS = "documentlibrary";

            codePage[19].SetToken(0x05, "LinkId");
            codePage[19].SetToken(0x06, "DisplayName");
            codePage[19].SetToken(0x07, "IsFolder");
            codePage[19].SetToken(0x08, "CreationDate");
            codePage[19].SetToken(0x09, "LastModifiedDate");
            codePage[19].SetToken(0x0A, "IsHidden");
            codePage[19].SetToken(0x0B, "ContentLength");
            codePage[19].SetToken(0x0C, "ContentType");
            #endregion

            #region CodePage 20: ItemOperations
            /**
             * "ItemOperations CodePage" specifies the codepage for item operations in the ActiveSync protocol.
             * 
             * CodePage Number == 0x14
             * 
             * Note: Move, DstFldId, ConversationId & MoveAlways tags are not supported when the MS-ASProtocolVersion 
             *       header is set to 12.1.
             **/

            codePage[20] = new ASWBXMLCodePage();
            codePage[20].Namespace = "ItemOperations";
            codePage[20].XmlNS = "itemoperations";

            codePage[20].SetToken(0x05, "ItemOperations");
            codePage[20].SetToken(0x06, "Fetch");
            codePage[20].SetToken(0x07, "Store");
            codePage[20].SetToken(0x08, "Options");
            codePage[20].SetToken(0x09, "Range");
            codePage[20].SetToken(0x0A, "Total");
            codePage[20].SetToken(0x0B, "Properties");
            codePage[20].SetToken(0x0C, "Data");
            codePage[20].SetToken(0x0D, "Status");
            codePage[20].SetToken(0x0E, "Response");
            codePage[20].SetToken(0x0F, "Version");
            codePage[20].SetToken(0x10, "Schema");
            codePage[20].SetToken(0x11, "Part");
            codePage[20].SetToken(0x12, "EmptyFolderContents");
            codePage[20].SetToken(0x13, "DeleteSubFolders");
            codePage[20].SetToken(0x14, "UserName");
            codePage[20].SetToken(0x15, "Password");
            codePage[20].SetToken(0x16, "Move");
            codePage[20].SetToken(0x17, "DstFldId");
            codePage[20].SetToken(0x18, "ConversationId");
            codePage[20].SetToken(0x19, "MoveAlways");
            #endregion

            #region CodePage 21: ComposeMail
            /**
             * "ComposeMail CodePage" specifies the codepage for mail compose in the ActiveSync protocol.
             * 
             * CodePage Number == 0x15
             * 
             * Note: AccountId tag is not supported when the MS-ASProtocolVersion header is set to 12.1 or 14.0.
             **/

            codePage[21] = new ASWBXMLCodePage();
            codePage[21].Namespace = "ComposeMail";
            codePage[21].XmlNS = "composemail";

            codePage[21].SetToken(0x05, "SendMail");
            codePage[21].SetToken(0x06, "SmartForward");
            codePage[21].SetToken(0x07, "SmartReply");
            codePage[21].SetToken(0x08, "SaveInSentItems");
            codePage[21].SetToken(0x09, "ReplaceMime");
            codePage[21].SetToken(0x0B, "Source");
            codePage[21].SetToken(0x0C, "FolderId");
            codePage[21].SetToken(0x0D, "ItemId");
            codePage[21].SetToken(0x0E, "LongId");
            codePage[21].SetToken(0x0F, "InstanceId");
            codePage[21].SetToken(0x10, "MIME");
            codePage[21].SetToken(0x11, "ClientId");
            codePage[21].SetToken(0x12, "Status");
            codePage[21].SetToken(0x13, "AccountId");
            #endregion

            #region CodePage 22: Email2
            /**
             * "Email2 CodePage" specifies the codepage for Email2 in the ActiveSync protocol.
             * 
             * CodePage Number == 0x16
             * 
             * Note: AccountId, FirstDayOfWeek & MeetingMessageType tags are not supported when 
             *       the MS-ASProtocolVersion header is set to 12.1 or 14.0.
             **/

            codePage[22] = new ASWBXMLCodePage();
            codePage[22].Namespace = "Email2";
            codePage[22].XmlNS = "email2";

            codePage[22].SetToken(0x05, "UmCallerID");
            codePage[22].SetToken(0x06, "UmUserNotes");
            codePage[22].SetToken(0x07, "UmAttDuration");
            codePage[22].SetToken(0x08, "UmAttOrder");
            codePage[22].SetToken(0x09, "ConversationId");
            codePage[22].SetToken(0x0A, "ConversationIndex");
            codePage[22].SetToken(0x0B, "LastVerbExecuted");
            codePage[22].SetToken(0x0C, "LastVerbExecutionTime");
            codePage[22].SetToken(0x0D, "ReceivedAsBcc");
            codePage[22].SetToken(0x0E, "Sender");
            codePage[22].SetToken(0x0F, "CalendarType");
            codePage[22].SetToken(0x10, "IsLeapMonth");
            codePage[22].SetToken(0x11, "AccountId");
            codePage[22].SetToken(0x12, "FirstDayOfWeek");
            codePage[22].SetToken(0x13, "MeetingMessageType");
            #endregion

            #region CodePage 23: Notes
            /**
             * "Notes CodePage" specifies the codepage for notes in the ActiveSync protocol.
             * 
             * CodePage Number == 0x17
             **/

            codePage[23] = new ASWBXMLCodePage();
            codePage[23].Namespace = "Notes";
            codePage[23].XmlNS = "notes";

            codePage[23].SetToken(0x05, "Subject");
            codePage[23].SetToken(0x06, "MessageClass");
            codePage[23].SetToken(0x07, "LastModifiedDate");
            codePage[23].SetToken(0x08, "Categories");
            codePage[23].SetToken(0x09, "Category");
            #endregion

            #region CodePage 24: RightsManagement
            /**
             * "RightsManagement CodePage" specifies the codepage for rights management in the ActiveSync protocol.
             * 
             * CodePage Number == 0x18
             * 
             * Note: This codepage is not supported when the MS-ASProtocolVersion header is set to 12.1 or 14.0.
             **/

            codePage[24] = new ASWBXMLCodePage();
            codePage[24].Namespace = "RightsManagement";
            codePage[24].XmlNS = "rightsmanagement";

            codePage[24].SetToken(0x05, "RightsManagementSupport");
            codePage[24].SetToken(0x06, "RightsManagementTemplates");
            codePage[24].SetToken(0x07, "RightsManagementTemplate");
            codePage[24].SetToken(0x08, "RightsManagementLicense");
            codePage[24].SetToken(0x09, "EditAllowed");
            codePage[24].SetToken(0x0A, "ReplyAllowed");
            codePage[24].SetToken(0x0B, "ReplyAllAllowed");
            codePage[24].SetToken(0x0C, "ForwardAllowed");
            codePage[24].SetToken(0x0D, "ModifyRecipientsAllowed");
            codePage[24].SetToken(0x0E, "ExtractAllowed");
            codePage[24].SetToken(0x0F, "PrintAllowed");
            codePage[24].SetToken(0x10, "ExportAllowed");
            codePage[24].SetToken(0x11, "ProgrammaticAccessAllowed");
            codePage[24].SetToken(0x12, "RMOwner");
            codePage[24].SetToken(0x13, "ContentExpiryDate");
            codePage[24].SetToken(0x14, "TemplateID");
            codePage[24].SetToken(0x15, "TemplateName");
            codePage[24].SetToken(0x16, "TemplateDescription");
            codePage[24].SetToken(0x17, "ContentOwner");
            codePage[24].SetToken(0x18, "RemoveRightsManagementDistribution");
            #endregion
            #endregion
        }

        // The LoadXML function loads a string containing an XML document. 
        internal void LoadXML(string strXML)
        {
            XmlReader xmlReader = XmlReader.Create(new StringReader(strXML));
            xmlDoc.Load(xmlReader);
        }

        // The GetXML function returns a string containing an XML document. 
        internal string GetXML()
        {
            StringWriter stringWriter = new StringWriter();
            XmlTextWriter xmlWriter = new XmlTextWriter(stringWriter);
            xmlWriter.Formatting = Formatting.Indented;
            xmlDoc.WriteTo(xmlWriter);
            xmlWriter.Flush();

            return stringWriter.ToString();
        }

        // The LoadBytes function loads a byte array containing WBXML bytes
        internal void LoadBytes(byte[] byteWBXML)
        {
            xmlDoc = new XmlDocument();

            ASWBXMLByteQueue bytes = new ASWBXMLByteQueue(byteWBXML);

            // Version is ignored
            byte version = bytes.Dequeue();

            // Public Identifier is ignored
            int publicIdentifier = bytes.DequeueMultibyteInt();

            // Currently "character set = UTF-8" is supported, throw if something else.
            // TBD: For enhanced capabilities the harness should handle additional character sets.
            int charset = bytes.DequeueMultibyteInt();
            if (charset != 0x6A)
                throw new InvalidDataException("Currently the harness only supports UTF-8 encoded XML.");

            // String table length should be 0, MS-ASWBXML does not use string tables
            int stringTableLength = bytes.DequeueMultibyteInt();
            if (stringTableLength != 0)
                throw new InvalidDataException("WBXML data contains a string table.");

            // Add the declaration for the body of the data.
            XmlDeclaration xmlDeclaration = xmlDoc.CreateXmlDeclaration("1.0", "utf-8", null);
            xmlDoc.InsertBefore(xmlDeclaration, null);

            XmlNode currentNode = xmlDoc;

            while (bytes.Count > 0)
            {
                byte currentByte = bytes.Dequeue();

                switch ((GlobalTokens)currentByte)
                {
                    // Check for a global token that we actually implement
                    case GlobalTokens.SWITCH_PAGE:
                        int newCodePage = (int)bytes.Dequeue();
                        if (newCodePage >= 0 && newCodePage < 25)
                        {
                            currentCodePage = newCodePage;
                        }
                        else
                        {
                            throw new InvalidDataException(string.Format("Unknown codepage ID 0x{0:X} encountered in WBXML", currentByte));
                        }
                        break;

                    case GlobalTokens.END:
                        if (currentNode.ParentNode != null)
                        {
                            currentNode = currentNode.ParentNode;
                        }
                        else
                        {
                            throw new InvalidDataException("END global token encountered out of sequence");
                        }
                        break;

                    case GlobalTokens.OPAQUE:
                        int CDATALength = bytes.DequeueMultibyteInt();
                        XmlCDataSection newOpaqueNode = xmlDoc.CreateCDataSection(bytes.DequeueString(CDATALength));
                        currentNode.AppendChild(newOpaqueNode);
                        break;

                    case GlobalTokens.STR_I:
                        XmlNode newTextNode = xmlDoc.CreateTextNode(bytes.DequeueString());
                        currentNode.AppendChild(newTextNode);
                        break;

                    // According to MS-ASWBXML, these features aren't used
                    case GlobalTokens.ENTITY:
                    case GlobalTokens.EXT_0:
                    case GlobalTokens.EXT_1:
                    case GlobalTokens.EXT_2:
                    case GlobalTokens.EXT_I_0:
                    case GlobalTokens.EXT_I_1:
                    case GlobalTokens.EXT_I_2:
                    case GlobalTokens.EXT_T_0:
                    case GlobalTokens.EXT_T_1:
                    case GlobalTokens.EXT_T_2:
                    case GlobalTokens.LITERAL:
                    case GlobalTokens.LITERAL_A:
                    case GlobalTokens.LITERAL_AC:
                    case GlobalTokens.LITERAL_C:
                    case GlobalTokens.PI:
                    case GlobalTokens.STR_T:
                        throw new InvalidDataException(string.Format("Encountered unknown global token 0x{0:X}.", currentByte));

                    // If it's not a global token, it should be a tag
                    default:
                        bool hasAttributes = false;
                        bool hasContent = false;

                        hasAttributes = (currentByte & 0x80) > 0;
                        hasContent = (currentByte & 0x40) > 0;

                        byte token = (byte)(currentByte & 0x3F);

                        if (hasAttributes)
                            // Maybe use Trace.Assert here?
                            throw new InvalidDataException(string.Format("Token 0x{0:X} has attributes.", token));

                        string strTag = codePage[currentCodePage].GetTag(token);
                        if (strTag == null)
                        {
                            strTag = string.Format("UNKNOWN_TAG_{0,2:X}", token);
                        }

                        XmlNode newNode = xmlDoc.CreateElement(codePage[currentCodePage].XmlNS, strTag, codePage[currentCodePage].Namespace);
                        newNode.Prefix = codePage[currentCodePage].XmlNS;
                        currentNode.AppendChild(newNode);

                        if (hasContent)
                        {
                            currentNode = newNode;
                        }
                        break;
                }
            }
        }

        // The GetBytes function returns a byte array containing WBXML bytes
        internal byte[] GetBytes()
        {
            List<byte> byteList = new List<byte>();

            // Add the WBXML header
            byteList.Add(wbxmlVersion);
            byteList.Add(publicID);
            byteList.Add(charSet);
            byteList.Add(stringTableLength);

            // Encode the XML nodes into the WBXML stream.
            foreach (XmlNode node in xmlDoc.ChildNodes)
            {
                byteList.AddRange(EncodeNode(node));
            }

            return byteList.ToArray();
        }

        private byte[] EncodeNode(XmlNode node)
        {
            List<byte> byteList = new List<byte>();

            switch (node.NodeType)
            {
                case XmlNodeType.Element:
                    if (node.Attributes.Count > 0)
                    {
                        ParseXmlNSAttributes(node);
                    }

                    if (SetCodePageByXmlNS(node.Prefix))
                    {
                        byteList.Add((byte)GlobalTokens.SWITCH_PAGE);
                        byteList.Add((byte)currentCodePage);
                    }

                    byte token = codePage[currentCodePage].GetToken(node.LocalName);

                    if (node.HasChildNodes)
                    {
                        token |= 0x40;
                    }

                    byteList.Add(token);

                    if (node.HasChildNodes)
                    {
                        foreach (XmlNode child in node.ChildNodes)
                        {
                            byteList.AddRange(EncodeNode(child));
                        }

                        byteList.Add((byte)GlobalTokens.END);
                    }
                    break;

                case XmlNodeType.Text:
                    byteList.Add((byte)GlobalTokens.STR_I);
                    byteList.AddRange(EncodeString(node.Value));
                    break;

                case XmlNodeType.CDATA:
                    byteList.Add((byte)GlobalTokens.OPAQUE);
                    byteList.AddRange(EncodeOpaque(node.Value));
                    break;

                default:
                    break;
            }

            return byteList.ToArray();
        }

        private int GetCodePageByXmlNS(string XmlNS)
        {
            for (int i = 0; i < codePage.Length; i++)
            {
                if (codePage[i].XmlNS.ToUpper() == XmlNS.ToUpper())
                {
                    return i;
                }
            }

            return -1;
        }

        private bool SetCodePageByXmlNS(string XmlNS)
        {
            if (XmlNS == null || XmlNS == "")
            {
                // Try default namespace
                if (currentCodePage != defaultCodePage)
                {
                    currentCodePage = defaultCodePage;
                    return true;
                }

                return false;
            }

            // Try current first
            if (codePage[currentCodePage].XmlNS.ToUpper() == XmlNS.ToUpper())
            {
                return false;
            }

            for (int i = 0; i < codePage.Length; i++)
            {
                if (codePage[i].XmlNS.ToUpper() == XmlNS.ToUpper())
                {
                    currentCodePage = i;
                    return true;
                }
            }

            throw new InvalidDataException(string.Format("Unknown XmlNS: {0}.", XmlNS));
        }

        private int GetCodePageByNamespace(string nameSpace)
        {
            for (int i = 0; i < codePage.Length; i++)
            {
                if (codePage[i].Namespace.ToUpper() == nameSpace.ToUpper())
                {
                    return i;
                }
            }

            return -1;
        }

        private void ParseXmlNSAttributes(XmlNode node)
        {
            foreach (XmlAttribute attribute in node.Attributes)
            {
                int cp = GetCodePageByNamespace(attribute.Value);

                if (attribute.Name.ToUpper() == "XMLNS")
                {
                    defaultCodePage = cp;
                }
                else if (attribute.Prefix.ToUpper() == "XMLNS")
                {
                    codePage[cp].XmlNS = attribute.LocalName;
                }
            }
        }

        private byte[] EncodeString(string value)
        {
            List<byte> byteList = new List<byte>();

            char[] charArray = value.ToCharArray();

            for (int i = 0; i < charArray.Length; i++)
            {
                byteList.Add((byte)charArray[i]);
            }

            byteList.Add(0x00);

            return byteList.ToArray();
        }

        private byte[] EncodeOpaque(string value)
        {
            List<byte> byteList = new List<byte>();

            char[] charArray = value.ToCharArray();

            byteList.AddRange(EncodeMultiByteInteger(charArray.Length));

            for (int i = 0; i < charArray.Length; i++)
            {
                byteList.Add((byte)charArray[i]);
            }

            return byteList.ToArray();
        }

        private byte[] EncodeMultiByteInteger(int value)
        {
            List<byte> byteList = new List<byte>();

            int shiftedValue = value;

            while (value > 0)
            {
                byte addByte = (byte)(value & 0x7F);

                if (byteList.Count > 0)
                {
                    addByte |= 0x80;
                }

                byteList.Insert(0, addByte);

                value >>= 7;
            }

            return byteList.ToArray();
        }
    }
}