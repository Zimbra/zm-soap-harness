using System;
using System.Collections.Generic;
using System.Text;
using System.Xml;
using Microsoft.Web.Services3;
using Soap;
using SyncHarness;

namespace SoapWebClient
{
    public class InvObject : XmlDocument
    {

        XmlElement compXmlElement;

        public InvObject()
        {
            XmlElement xmlElement = this.CreateElement("inv");
            this.AppendChild(xmlElement);

            compXmlElement = this.CreateElement("comp");
            compXmlElement.SetAttribute("method", "REQUEST");
            compXmlElement.SetAttribute("type", "event");
            compXmlElement.SetAttribute("fb", "B");
            compXmlElement.SetAttribute("transp", "O");
            compXmlElement.SetAttribute("name", "name");
            this.FirstChild.AppendChild(compXmlElement);
            
        }

        // For modifying the reminder
        public InvObject(string uid)
        {
            XmlElement xmlElement = this.CreateElement("inv");
            xmlElement.SetAttribute("uid", uid);
            this.AppendChild(xmlElement);

            compXmlElement = this.CreateElement("comp");
            compXmlElement.SetAttribute("method", "REQUEST");
            compXmlElement.SetAttribute("type", "event");
            compXmlElement.SetAttribute("fb", "B");
            compXmlElement.SetAttribute("transp", "O");
            compXmlElement.SetAttribute("name", "name");

            this.FirstChild.AppendChild(compXmlElement);

        }

        public InvObject setPrivate()
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("class", "PRI");
            return (this);
        }

        public InvObject setAllDay()
        {
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("comp")[0];
            xmlElement.SetAttribute("allDay", "1");
            return (this);
        }


        public InvObject SetParent(string folderId)
        {
            if (this.Attributes != null)
            {

                // Change the Attribute if it already exists
                foreach (XmlAttribute a in this.Attributes)
                {
                    if (a.Name.Equals("l"))
                    {
                        a.Value = folderId;
                        return (this);
                    }
                }

            }

            // Attribute does not exist, add it
            XmlElement xmlElement = (XmlElement)this.GetElementsByTagName("m")[0];
            xmlElement.SetAttribute("l", folderId);

            return (this);
        }


        public InvObject StartTime(DateTime dt, TimeZone timezone)
        {
            XmlElement xmlElement = this.CreateElement("s");

            xmlElement.SetAttribute("d", ICALSTRING(dt));
            if (timezone != null)
            {
                xmlElement.SetAttribute("tz", TIMEZONE(timezone));
            }

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject StartTime(string icaldatetime, string timezone)
        {
            XmlElement xmlElement = this.CreateElement("s");

            xmlElement.SetAttribute("d", icaldatetime);
            if (timezone != null)
            {
                xmlElement.SetAttribute("tz", timezone);
            }

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject StartTime(string icaldatetime)
        {
            XmlElement xmlElement = this.CreateElement("s");

            xmlElement.SetAttribute("d", icaldatetime);
            compXmlElement.AppendChild(xmlElement);

            return (this);
        }



        // Create a <tz> element
        // Use dateTime to determine which rule (if multiple) should be used
        public InvObject AddTimeZoneDef(TimeZoneInfo timeZoneInfo, DateTime dateTime)
        {

            XmlElement tzElement = this.CreateElement("tz");
            this.FirstChild.AppendChild(tzElement);

            tzElement.SetAttribute("id", timeZoneInfo.DisplayName);
            tzElement.SetAttribute("stdoff", timeZoneInfo.BaseUtcOffset.TotalMinutes.ToString());

            if (timeZoneInfo.SupportsDaylightSavingTime)
            {
                TimeZoneInfo.TransitionTime transition;

                foreach (TimeZoneInfo.AdjustmentRule adjustment in timeZoneInfo.GetAdjustmentRules())
                {

                    if (!((adjustment.DateStart < dateTime) && (adjustment.DateEnd > dateTime)))
                    {
                        // not an active adjustment rule
                        continue;
                    }


                    int baseMinutes = (int)timeZoneInfo.BaseUtcOffset.TotalMinutes;
                    int daylightMinutes = (int)adjustment.DaylightDelta.TotalMinutes;
                    if (timeZoneInfo.DisplayName.Equals("(GMT+02:00) Windhoek") && daylightMinutes < 0)
                    {
                        daylightMinutes = -1 * daylightMinutes; // A bug in .NET?
                    }

                    tzElement.SetAttribute("dayoff", (baseMinutes + daylightMinutes).ToString());

                    XmlElement standardElement = this.CreateElement("standard");
                    tzElement.AppendChild(standardElement);


                    transition = adjustment.DaylightTransitionEnd;
                    if (transition.IsFixedDateRule)
                    {
                        throw new HarnessException("standardStart: IsFixedDateRule is not supported");
                    }
                    else
                    {
                        standardElement.SetAttribute("mon", transition.Month.ToString());
                        int week = transition.Week;
                        if (week == 5)
                            week = -1;
                        standardElement.SetAttribute("week", week.ToString());
                        int wkday = 1;
                        switch (transition.DayOfWeek)
                        {
                            case DayOfWeek.Sunday: wkday = 1; break;
                            case DayOfWeek.Monday: wkday = 2; break;
                            case DayOfWeek.Tuesday: wkday = 3; break;
                            case DayOfWeek.Wednesday: wkday = 4; break;
                            case DayOfWeek.Thursday: wkday = 5; break;
                            case DayOfWeek.Friday: wkday = 6; break;
                            case DayOfWeek.Saturday: wkday = 7; break;
                        }
                        standardElement.SetAttribute("wkday", wkday.ToString());
                        standardElement.SetAttribute("hour", transition.TimeOfDay.Hour.ToString());
                        standardElement.SetAttribute("min", transition.TimeOfDay.Minute.ToString());
                        standardElement.SetAttribute("sec", transition.TimeOfDay.Second.ToString());
                    }




                    XmlElement daylightElement = this.CreateElement("daylight");
                    tzElement.AppendChild(daylightElement);

                    transition = adjustment.DaylightTransitionStart;
                    if (transition.IsFixedDateRule)
                    {
                        throw new HarnessException("daylightStart: IsFixedDateRule is not supported");
                    }
                    else
                    {
                        daylightElement.SetAttribute("mon", transition.Month.ToString());
                        int week = transition.Week;
                        if (week == 5)
                            week = -1;
                        daylightElement.SetAttribute("week", week.ToString());
                        int wkday = 1;
                        switch (transition.DayOfWeek)
                        {
                            case DayOfWeek.Sunday: wkday = 1; break;
                            case DayOfWeek.Monday: wkday = 2; break;
                            case DayOfWeek.Tuesday: wkday = 3; break;
                            case DayOfWeek.Wednesday: wkday = 4; break;
                            case DayOfWeek.Thursday: wkday = 5; break;
                            case DayOfWeek.Friday: wkday = 6; break;
                            case DayOfWeek.Saturday: wkday = 7; break;
                        }
                        daylightElement.SetAttribute("wkday", wkday.ToString());
                        daylightElement.SetAttribute("hour", transition.TimeOfDay.Hour.ToString());
                        daylightElement.SetAttribute("min", transition.TimeOfDay.Minute.ToString());
                        daylightElement.SetAttribute("sec", transition.TimeOfDay.Second.ToString());
                    }

                }

            }


            return (this);
        }


        public InvObject StartTime(DateTime dt, string timezone)
        {
            XmlElement xmlElement = this.CreateElement("s");

            xmlElement.SetAttribute("d", ICALSTRING(dt));
            if (timezone != null)
            {
                xmlElement.SetAttribute("tz", timezone);
            }

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject EndTime(DateTime dt, TimeZone timezone)
        {
            XmlElement xmlElement = this.CreateElement("e");

            xmlElement.SetAttribute("d", ICALSTRING(dt));
            if (timezone != null)
            {
                xmlElement.SetAttribute("tz", TIMEZONE(timezone));
            }

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject EndTime(string icaldatetime, string timezone)
        {
            XmlElement xmlElement = this.CreateElement("e");

            xmlElement.SetAttribute("d", icaldatetime);
            if (timezone != null)
            {
                xmlElement.SetAttribute("tz", timezone);
            }

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject EndTime(string icaldatetime)
        {
            XmlElement xmlElement = this.CreateElement("e");

            xmlElement.SetAttribute("d", icaldatetime);
            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject EndTime(DateTime dt, string timezone)
        {
            XmlElement xmlElement = this.CreateElement("e");

            xmlElement.SetAttribute("d", ICALSTRING(dt));
            if (timezone != null)
            {
                xmlElement.SetAttribute("tz", timezone);
            }

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject Summary(string n)
        {

            // Change the Attribute if it already exists
            foreach (XmlAttribute a in compXmlElement.Attributes)
            {
                if (a.Name.Equals("name"))
                {
                    a.Value = n;
                    return (this);
                }
            }

            compXmlElement.SetAttribute("name", n);

            return (this);
        }

        public InvObject Location(string l)
        {

            // Change the Attribute if it already exists
            foreach (XmlAttribute a in compXmlElement.Attributes)
            {
                if (a.Name.Equals("loc"))
                {
                    a.Value = l;
                    return (this);
                }
            }

            compXmlElement.SetAttribute("loc", l);

            return (this);
        }

        public InvObject AddAttendee(string emailAddress)
        {
            return (AddAttendee(emailAddress, "REQ", "NE", "1"));
        }

        public InvObject AddAttendee(string emailAddress, string role, string ptst, string rsvp)
        {

            XmlElement xmlElement = this.CreateElement("at");
            xmlElement.SetAttribute("a", emailAddress);
            xmlElement.SetAttribute("role", role);
            xmlElement.SetAttribute("ptst", ptst);
            xmlElement.SetAttribute("rsvp", rsvp);
            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject AddResource(string emailAddress)
        {
            return (AddResource(emailAddress, "NON", "NE", "RES", "1"));
        }

        public InvObject AddReminder(string minutes)
        {
            return (AddReminder(minutes, "START", "1"));
        }

        public InvObject AddReminder(string minutes, string related, string neg)
        {
            XmlElement xmlElement = this.CreateElement("alarm");
            xmlElement.SetAttribute("action", "DISPLAY");
            XmlElement xmlTrigger = this.CreateElement("trigger");
            XmlElement xmlRel = this.CreateElement("rel");
            xmlRel.SetAttribute("m", minutes);
            xmlRel.SetAttribute("related", related);
            xmlRel.SetAttribute("neg", neg);
            xmlTrigger.AppendChild(xmlRel);
            xmlElement.AppendChild(xmlTrigger);

            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject AddRecurrence(string frequency, string interval, object endtype, string byday)
        {
            XmlElement xmlElement = this.CreateElement("recur");
            XmlElement xmlAddRecur = this.CreateElement("add");
            XmlElement xmlRule = this.CreateElement("rule");
            xmlRule.SetAttribute("freq", frequency);
            XmlElement xmlInterval = this.CreateElement("interval");
            xmlInterval.SetAttribute("ival", interval);

            XmlElement xmlType = null;
            if (endtype != null)
            {
                if (System.Type.GetTypeCode(endtype.GetType()).Equals(System.TypeCode.DateTime))
                {
                    xmlType = this.CreateElement("until");
                    xmlType.SetAttribute("d", ((DateTime)endtype).ToString("yyyyMMdd"));
                    xmlRule.AppendChild(xmlType);
                }

                if (System.Type.GetTypeCode(endtype.GetType()).Equals(System.TypeCode.String))
                {
                    xmlType = this.CreateElement("count");
                    xmlType.SetAttribute("num", endtype.ToString());
                    xmlRule.AppendChild(xmlType);
                }
            }

            if (byday != null)
            {
                XmlElement xmlByday = this.CreateElement("byday");
                XmlElement xmlWkday = null;
                foreach(string s in byday.Split(",".ToCharArray()))
                {
                    xmlWkday = this.CreateElement("wkday");
                    xmlWkday.SetAttribute("day", s);
                    xmlByday.AppendChild(xmlWkday);
                }
                
                xmlRule.AppendChild(xmlByday);
            }


            xmlRule.AppendChild(xmlInterval);
            xmlAddRecur.AppendChild(xmlRule);
            xmlElement.AppendChild(xmlAddRecur);

            compXmlElement.AppendChild(xmlElement);
            return (this);
        }

        public InvObject AddRecurrence(string frequency, string interval, object endtype)
        {
            return(AddRecurrence(frequency, interval, endtype, null));
        }


        public InvObject AddResource(string emailAddress, string role, string ptst, string cutype, string rsvp)
        {

            XmlElement xmlElement = this.CreateElement("at");
            xmlElement.SetAttribute("a", emailAddress);
            xmlElement.SetAttribute("role", role);
            xmlElement.SetAttribute("ptst", ptst);
            xmlElement.SetAttribute("cutype", cutype);
            xmlElement.SetAttribute("rsvp", rsvp);
            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        public InvObject AddOrganizer(string emailAddress)
        {
            XmlElement xmlElement = this.CreateElement("or");
            xmlElement.SetAttribute("a", emailAddress);
            compXmlElement.AppendChild(xmlElement);

            return (this);
        }

        private string ICALSTRING(DateTime t)
        {
            return (t.ToString("yyyyMMdd'T'HHmmss"));
        }

        private string TIMEZONE(TimeZone timezone)
        {
            
            // TODO: is there a better way to get the standard information?
            // It looks like TimeZoneInfo is better, but not supported in OLK2003
            //

            if (timezone.StandardName.Equals("Pacific Standard Time"))
            {
                return ("(GMT-08.00) Pacific Time (US & Canada)");
            }

            if (timezone.StandardName.Equals("Eastern Standard Time"))
            {
                return ("(GMT-05.00) Eastern Time (US & Canada)");
            }

            if (timezone.StandardName.Equals("India Standard Time"))
            {
                return ("(GMT+05.30) Chennai / Kolkata / Mumbai / New Delhi");
            }

            throw new HarnessException("Need translation for timezone named " + timezone.StandardName);

        }

    }

    public class CreateAppointmentRequest : RequestBody
    {

        public CreateAppointmentRequest()
            : base()
        {
            XmlElement xmlElement = this.CreateElement("CreateAppointmentRequest", "urn:zimbraMail");
            this.AppendChild(xmlElement);
        }

        public CreateAppointmentRequest(string envelope)
            : base(envelope)
        {
        }

        public CreateAppointmentRequest AddMessage(MessageObject message)
        {
            this.FirstChild.AppendChild(this.ImportNode(message.DocumentElement, true));
            return (this);
        }

    }
}

