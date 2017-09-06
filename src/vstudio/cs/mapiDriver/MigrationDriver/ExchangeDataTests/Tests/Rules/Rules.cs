using System;
using System.Collections.Generic;
using System.Text;
using NUnit.Framework;
using Harness;
using System.Xml;
using Soap;

namespace ExchangeDataTests.Rules
{
    public class Rules : BaseTestFixture
    {
        private string DefaultDomain;

        public Rules()
        {
            DefaultDomain = GlobalProperties.getProperty("defaultdomain.name");
            this.TargetAccount = ZAccount.GetAccount("zma5", DefaultDomain);
        }

        [Test, Description("Verify simple rule with From condition and Move action is migrated correctly")]
        public void TC1_FromCondition_MoveAction()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC1_FromCondition_MoveAction");

            #region Test Case variables
            string ruleName = "Filter1";

            #endregion

            #region SOAP Block

            // GetFilterRulesRequest
            TargetAccount.sendSOAP("<GetFilterRulesRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:filterRule[@name='" + ruleName + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterRule", "active", "1", null, 1); //check if filter is active
            TargetAccount.selectSOAP(m, "//mail:filterTests", "condition", "allof", null, 1); //check if all conditions should be satisfied to process filter

            //Following section validates the condition
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='0']", "header", "From", null, 1); //From condition
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='0']", "stringComparison", "contains", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='0']", "value", "ma2", null, 1); //From value

            //Following section validates the action
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionFileInto[@index='0']", "folderPath", "Inbox/Folder100", null, 1); //Action=Move to folder
            
            #endregion

        }

        [Test, Description("Verify rule with Subject condition, Move action and From exception is migrated correctly")]
        public void TC2_SubCondition_MoveAction_FromException()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC2_SubCondition_MoveAction_FromException");

            #region Test Case variables
            string ruleName = "Filter2";
            
            #endregion

            #region SOAP Block

            // GetFilterRulesRequest
            TargetAccount.sendSOAP("<GetFilterRulesRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:filterRule[@name='" + ruleName + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterRule", "active", "1", null, 1); //check if filter is active
            TargetAccount.selectSOAP(m, "//mail:filterTests", "condition", "allof", null, 1); //check if all conditions should be satisfied to process filter

            //Following section validates the exception
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", "negative", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", "stringComparison", "contains", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", "value", "ma1", null, 1);

            //Following section validates the condition
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='Subject']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='Subject']", "stringComparison", "contains", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='Subject']", "value", "test", null, 1);

            //Following section validates the action
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionFileInto", "folderPath", "Inbox/Folder100", null, 1);
            
            #endregion

        }

        [Test, Description("Verify rule with own address in cc condition, Forward action and From exception is migrated correctly")]
        public void TC3_CCCondition_FwdAction_FromException()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC3_CCCondition_FwdAction_FromException");

            #region Test Case variables
            string ruleName = "Filter3";

            #endregion

            #region SOAP Block

            // GetFilterRulesRequest
            TargetAccount.sendSOAP("<GetFilterRulesRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:filterRule[@name='" + ruleName + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterRule", "active", "1", null, 1); //check if filter is active
            TargetAccount.selectSOAP(m, "//mail:filterTests", "condition", "allof", null, 1); //check if all conditions should be satisfied to process filter

            //Following section validates the exception
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", "negative", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", "stringComparison", "contains", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='From']", "value", "ma1", null, 1);

            //Following section validates the condition
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='cc']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='cc']", "stringComparison", "contains", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@header='cc']", "value", "zma5", null, 1);

            //Following section validates the action
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionRedirect", "a", "ma1", null, 1);
            
            #endregion

        }

        [Test, Description("Verify rule with two conditions: junk in body and sent to me, Delete action, zimbra in body exception and stop further processing is migrated correctly")]
        public void TC4_Body_ToCondition_DelAction_BodyException()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC4_Body_ToCondition_DelAction_BodyException");

            #region Test Case variables
            string ruleName = "Filter4";

            #endregion

            #region SOAP Block

            // GetFilterRulesRequest
            TargetAccount.sendSOAP("<GetFilterRulesRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:filterRule[@name='" + ruleName + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterRule", "active", "1", null, 1); //check if filter is active
            TargetAccount.selectSOAP(m, "//mail:filterTests", "condition", "allof", null, 1); //check if all conditions should be satisfied to process filter

            //Following section validates the condition
            //Condition1
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='0']", "header", "to", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='0']", "stringComparison", "contains", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='0']", "value", "zma5", null, 1);

            //Condition2
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:bodyTest[@index='1']", "value", "junk", null, 1);
            
            //Following section validates the exception
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:bodyTest[@index='2']", "negative", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:bodyTest[@index='2']", "value", "zimbra", null, 1);
            
            //Following section validates the action
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionFileInto[@index='0']", "folderPath", "Trash", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionStop", null, null, null, 1); //Stop processing hint present

            #endregion

        }

        [Test, Description("Verify rule with Size condition, Move action and stop further processing is migrated correctly")]
        public void TC5_SizeCondition_MoveAction()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC5_SizeCondition_MoveAction");

            #region Test Case variables
            string ruleName = "Filter8";

            #endregion

            #region SOAP Block

            // GetFilterRulesRequest
            TargetAccount.sendSOAP("<GetFilterRulesRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:filterRule[@name='" + ruleName + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterRule", "active", "1", null, 1); //check if filter is active
            TargetAccount.selectSOAP(m, "//mail:filterTests", "condition", "allof", null, 1); //check if all conditions should be satisfied to process filter

            //Following section validates the condition
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:sizeTest[@index='0']", "numberComparison", "over", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:sizeTest[@index='0']", "s", "1000K", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:sizeTest[@index='1']", "numberComparison", "under", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:sizeTest[@index='1']", "s", "20000K", null, 1);
            
            //Following section validates the action
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionFileInto[@index='0']", "folderPath", "Inbox/Folder102", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionStop", null, null, null, 1); //Stop processing hint present

            #endregion

        }

        [Test, Description("Verify rule with Date condition, Forward action and Private sensitivity exception is migrated correctly")]
        public void TC6_DateCondition_FwdAction_PrivateSensitivityException()
        {
            initialize(System.Reflection.MethodBase.GetCurrentMethod());
            logger.Info("Starting test case TC6_DateCondition_FwdAction_PrivateSensitivityException");

            #region Test Case variables
            string ruleName = "Filter9";
            string beforeDate = "1335258000"; //epoch value for 24 Apr 2012 considering HADT server timezone
            string afterDate = "1334912400"; //epoch value for 20 Apr 2012 considering HADT server timezone
            #endregion

            #region SOAP Block

            // GetFilterRulesRequest
            TargetAccount.sendSOAP("<GetFilterRulesRequest xmlns='urn:zimbraMail'/>");

            XmlNode m = TargetAccount.selectSOAP("//mail:filterRule[@name='" + ruleName + "']", null, null, null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterRule", "active", "1", null, 1); //check if filter is active
            TargetAccount.selectSOAP(m, "//mail:filterTests", "condition", "allof", null, 1); //check if all conditions should be satisfied to process filter

            //Following section validates the condition
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:dateTest[@dateComparison='before']", "d", beforeDate, null, 1);

            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:dateTest[@dateComparison='after']", "d", afterDate, null, 1);
            
            //Following section validates the exception
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='2']", "negative", "1", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='2']", "header", "Sensitivity", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='2']", "stringComparison", "is", null, 1);
            TargetAccount.selectSOAP(m, "//mail:filterTests/mail:headerTest[@index='2']", "value", "Private", null, 1);

            //Following section validates the action
            TargetAccount.selectSOAP(m, "//mail:filterActions/mail:actionRedirect[@index='0']", "a", "ma3", null, 1);
            
            #endregion

        }
    }
}
