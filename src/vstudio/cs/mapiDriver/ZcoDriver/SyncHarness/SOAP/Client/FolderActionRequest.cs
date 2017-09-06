using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class FolderActionRequest : RequestBody
    {
        public static string grantUser = "usr";
        public static string grantGroup = "grp";
        public static string grantDomain = "dom";
        public static string grantCos = "cos";
        public static string grantAll = "all";
        public static string grantPublic = "pub";
        public static string grantGuest = "guest";

        public static string rightsNone = "";
        public static string rightsRead = "r";
        public static string rightsWrite = "w";
        public static string rightsInsert = "i";
        public static string rightsDelete = "d";
        public static string rightsAdminister = "a";
        public static string rightsWorkflow = "x";

        public static string rightsZcoAdministrator = "rwidax";    // TBD: does this match the implementation?
        public static string rightsZcoDelegate = "rwidx";          // TBD: does this match the implementation?
        public static string rightsZcoEditor = "rwid";             // TBD: does this match the implementation?
        public static string rightsZcoAuthor = "rw";               // TBD: does this match the implementation?
        public static string rightsZcoReviewer = "r";              // TBD: does this match the implementation?

        public static string rightsZcoAdministratorPrivate = "rwidaxp";    
        public static string rightsZcoDelegatePrivate = "rwidxp";          
        public static string rightsZcoEditorPrivate = "rwidp";             
        public static string rightsZcoAuthorPrivate = "rwp";               
        public static string rightsZcoReviewerPrivate = "rp";              
        
        public FolderActionRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("FolderActionRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }
        public FolderActionRequest(string envelope)
            : base(envelope)
        {
        }
        public FolderActionRequest DeleteFolderbyID(string Id)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "delete");

            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }

        public FolderActionRequest EmptyFolderbyID(string Id)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("op", "empty");
            xmlElement.SetAttribute("id", Id);
            
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
        public FolderActionRequest MoveFolderbyID(string Id, string folderId)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "move");
            xmlElement.SetAttribute("l", folderId);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }
        public FolderActionRequest RenameFolderbyID(string Id, string newfolderName)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "rename");
            xmlElement.SetAttribute("name", newfolderName);
            this.FirstChild.AppendChild(this.ImportNode(xmlElement, true));
            return (this);
        }

        public FolderActionRequest GrantFolderbyID(string Id, string grantType, string account, string permissions)
        {
            XmlElement xmlElement = this.CreateElement("action");
            xmlElement.SetAttribute("id", Id);
            xmlElement.SetAttribute("op", "grant");

            XmlElement grantElement = this.CreateElement("grant");
            grantElement.SetAttribute("gt", grantType);
            grantElement.SetAttribute("d", account);
            grantElement.SetAttribute("perm", permissions);

            xmlElement.AppendChild(grantElement);
            this.FirstChild.AppendChild(xmlElement);

            return (this);

        }

    }
}

