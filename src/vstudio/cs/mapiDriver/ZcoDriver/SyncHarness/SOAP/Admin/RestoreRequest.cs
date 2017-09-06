using System;
using System.Collections.Generic;
using System.Text;
using Soap;
using System.Xml;

//<RestoreRequest>
//    <restore method="mb|ra|ca" [includeIncrementals="1|0"] 
//        [prefix="{prefix}"] [replayRedo="1|0"] [continue="1|0"]
//        [sysData="1|0"] 
//        [label="{label to full backup set}"] [target="{path to backup target}"]
//        [skipDeletedAccounts="1|0"]
//        [restoreToTime="time in millis"]
//        [restoreToRedoSeq="redo log sequence number"]
//        [restoreToIncrLabel="incremental backup label"]
//        [ignoreRedoErrors="0|1"]
//    >
//        <account name="{account email addr}"/>+ OR <account name="all"/>
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
//    </restore>
//</RestoreRequest>


namespace SoapAdmin
{
    public class RestoreRequest : RequestBody
    {
        XmlElement restoreElement = null;

        public RestoreRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("RestoreRequest", "urn:zimbraAdmin");
            this.AppendChild(xmlElement);

            restoreElement = this.CreateElement("restore");

            // Default values
            //
            restoreElement.SetAttribute("method", "ra");
            restoreElement.SetAttribute("includeIncrementals", "1");
            restoreElement.SetAttribute("replayRedo", "0");

            this.FirstChild.AppendChild(restoreElement);

        }

        public RestoreRequest(string requestString)
            : base(requestString)
        {
        }

        public RestoreRequest zAddAccount(string emailAddress)
        {

            XmlElement accountElement = this.CreateElement("account");
            accountElement.SetAttribute("name", emailAddress);

            restoreElement.AppendChild(accountElement);

            return (this);
        }

        public RestoreRequest zLabel(string label)
        {
            // Determine if label is already set.  If yes, then replace it.
            foreach (XmlAttribute a in restoreElement.Attributes)
            {
                if (a.Name.Equals("label"))
                {
                    a.Value = label;
                    return (this);
                }
            }

            // Label is not set.  Create it.
            restoreElement.SetAttribute("label", label);

            return (this);
        }
    }

}
