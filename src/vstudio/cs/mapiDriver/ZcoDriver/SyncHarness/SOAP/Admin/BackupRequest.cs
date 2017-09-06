using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Soap;



//<BackupRequest>
//    <backup method="full|incremental" 
//    [target="{path to backup target}"]
//    [sync="1|0"]         // run synchronously; command doesn't return until backup is finished
//    [zip="1|0"]          // backup blobs in zip files
//    [zipStore="1|0"]>    // if 1, store blobs uncompressed in zip files (used only when zip=1)
//        [<account name="{account email addr}"/>+ OR <account name="all"/>]
//        [<fileCopier fcMethod="PARALLEL | PIPE | SERIAL"
//                     [fcIOTYpe="OIO | NIO"]          // for all methods
//                     [fcOIOCopyBufferSize="bytes"]   // for all methods
//                     [fcAsyncQueueCapacity="num"]    // for PARALLEL and PIPE only
//                     [fcParallelWorkers="num"]       // for PARALLEL only
//                     [fcPipes="num"]                 // for PIPE only
//                     [fcPipeBufferSize="bytes"]      // for PIPE only
//                     [fcPipeReadersPerPipe="num"]    // for PIPE only
//                     [fcPipeWritersPerPipe="num"]    // for PIPE only
//        />]
//    <backup/>
//</BackupRequest>

namespace SoapAdmin
{
    public class BackupRequest : RequestBody
    {
        XmlElement backupElement = null;

        public BackupRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("BackupRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);

            backupElement = this.CreateElement("backup");

            // Default values
            //
            backupElement.SetAttribute("method", "full");
            backupElement.SetAttribute("sync", "1");

            this.FirstChild.AppendChild(backupElement);

        }

        public BackupRequest(string requestString)
            : base(requestString)
        {
        }

        public BackupRequest zAddAccount(string emailAddress)
        {

            XmlElement accountElement = this.CreateElement("account");
            accountElement.SetAttribute("name", emailAddress);

            backupElement.AppendChild(accountElement);

            return (this);
        }

    }
}
