using System;
using System.Collections.Generic;
using System.Text;
using System.Collections.ObjectModel;
using System.IO;
using log4net;
using System.Text.RegularExpressions;
using System.Globalization;

namespace SyncHarness
{
    public class zTimeZoneInfo
    {
        private static ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        private static string TimeZoneDefsFilename = "conf/SyncClient/timezones.ics";
      
        public static void GetTimeZonesFile()
        {
            string command = " fs get file /opt/zimbra/conf/timezones.ics";
            string output = SyncHarness.StafProcess.ProcessCommand(command);
            FileInfo tzFileInfo = new FileInfo(GlobalProperties.ZimbraQARoot + @"/" + TimeZoneDefsFilename);
            if (!tzFileInfo.Exists)
            {
                StreamWriter writer = new StreamWriter(GlobalProperties.ZimbraQARoot + @"/" + TimeZoneDefsFilename);
                writer.Write(output);
                writer.Flush();
                writer.Close();
            }
        }


        public static ReadOnlyCollection<string> GetZimbraTimeZones()
        {

            GetTimeZonesFile();
            FileInfo tzFileInfo = new FileInfo(GlobalProperties.ZimbraQARoot + @"/" + TimeZoneDefsFilename);
            if (!tzFileInfo.Exists)
            {
                throw new HarnessException("Unable to find " + tzFileInfo.FullName);
            }

            List<string> timezones = new List<string>();
            Regex regex = new Regex("(^TZID:)(.*)");

            StreamReader streamReader = File.OpenText(tzFileInfo.FullName);

            // Read first line
            string line;

            while ((line = streamReader.ReadLine()) != null)
            {
                Match match = regex.Match(line);
                if (match.Success)
                {
                    Group group = match.Groups[2];
                    timezones.Add(group.Value);
                    log.Debug("TZ: " + group.Value);
                }

            }

            return (new ReadOnlyCollection<string>(timezones));

        }

        // Given a time zone ID, get all its alias.
        public static ReadOnlyCollection<string> GetTimeZoneAlias(string timeZoneID)
        {
            FileInfo tzFileInfo = new FileInfo(GlobalProperties.ZimbraQARoot + @"/" + TimeZoneDefsFilename);
            if (!tzFileInfo.Exists)
            {
                throw new HarnessException("Unable to find " + tzFileInfo.FullName);
            }

            List<string> timeZoneAlias = new List<string>();
            //Regex regex = new Regex("TZID:" + timeZoneID);
            Regex regex1 = new Regex("(^X-ZIMBRA-TZ-ALIAS:)(.*)");
           
            StreamReader streamReader = File.OpenText(tzFileInfo.FullName);

            // Read first line
            string line;

            while ((line = streamReader.ReadLine()) != null)
            {
                
                string nextLine;
                if (line.Contains("TZID:" + timeZoneID))
                {
                    log.Debug("TZ : " + timeZoneID);

                    // Check for alias for the time zone.
                    while ((nextLine = streamReader.ReadLine()) != null && !(nextLine.Contains("END:VTIMEZONE")))
                    {
                        Match match1 = regex1.Match(nextLine);
                        if (match1.Success)
                        {
                            Group group = match1.Groups[2];
                            timeZoneAlias.Add(group.Value);
                            log.Debug("TZ Alias: " + group.Value);
                        }
                    }
                    break; // Since alias are searched between BEGIN:VTIMEZONE and END:VTIMEZONE. We need not have to look any further in the file. So break.
                }

            }
            return (new ReadOnlyCollection<string>(timeZoneAlias)); 
        }

        public static string ConvertTZIntoZimbraFormat(string specificTimezone)
        {

            FileInfo tzFileInfo = new FileInfo(GlobalProperties.ZimbraQARoot + @"/" + TimeZoneDefsFilename);
            if (!tzFileInfo.Exists)
            {
                throw new HarnessException("Unable to find " + tzFileInfo.FullName);
            }

            specificTimezone = specificTimezone.Replace(":", ".").Replace(",", " /");
            string timezone = specificTimezone;

            return ((string)timezone);

        }


        public static TimeZoneInfo GetTimeZoneInfo(string timeZoneId)
        {
            int count=0;
            ReadOnlyCollection<string> aliasList;
            aliasList = GetTimeZoneAlias(timeZoneId);
           
            do
            {

                foreach (TimeZoneInfo t in TimeZoneInfo.GetSystemTimeZones())
                {
                    if (t.DisplayName.Equals(timeZoneId))
                    {
                        return (t);
                    }

                    if (t.DisplayName.Equals(timeZoneId.Replace(".", ":")))
                    {
                        return (t);
                    }

                    if (t.DisplayName.Equals(timeZoneId.Replace(" /", ",")))
                    {
                        return (t);
                    }

                    if (t.DisplayName.Equals(timeZoneId.Replace(".", ":").Replace(" /", ",")))
                    {
                        return (t);
                    }                 
                                    
                }
                if (aliasList.Count > 0)
                {
                    timeZoneId = aliasList[count];
                }
                count++;
            } while (count < aliasList.Count + 1);

            #region TimeZone exceptions

            string id = "";

            // Exceptions

            // See http://bugzilla.zimbra.com/show_bug.cgi?id=32649 and http://www.timeanddate.com/news/time/venezuela-enters-half-hour-zone.html
            //
            // Two possible zones are:
            //
            // Venezuela Standard Time(Id) (GMT-04:30) Caracas(DisplayName)
            // SA Western Standard Time(Id) (GMT-04:00) La Paz(DisplayName)
            //
            if (timeZoneId.Equals("(GMT-04.00) Caracas / La Paz"))
                id = "SA Western Standard Time";

            // See http://bugzilla.zimbra.com/show_bug.cgi?id=23399 and http://www.timeanddate.com/news/time/argentina-dst-2008-2009.html
            //
            // Two possible zones are:
            //
            // Argentina Standard Time(Id) (GMT-03:00) Buenos Aires(DisplayName)
            // SA Eastern Standard Time(Id) (GMT-03:00) Georgetown(DisplayName)
            //
            if (timeZoneId.Equals("(GMT-03.00) Buenos Aires / Georgetown"))
                id = "SA Eastern Standard Time";

            // See http://www.timeanddate.com/news/time/morocco-ends-dst-early-2008.html
            //
            // Two possible zones are:
            //
            // Morocco Standard Time(Id) (GMT) Casablanca(DisplayName)
            // Greenwich Standard Time(Id) (GMT) Monrovia, Reykjavik(DisplayName)
            //
            if (timeZoneId.Equals("(GMT) Casablanca / Monrovia / Reykjavik"))
                id = "Greenwich Standard Time";

            // See http://www.timeanddate.com/news/time/pakistan-extends-dst-2008.html
            //
            //
            // Two possible zones are:
            //
            // Pakistan Standard Time(Id) (GMT+05:00) Islamabad, Karachi(DisplayName)
            // West Asia Standard Time(Id) (GMT+05:00) Tashkent(DisplayName)
            //

            if (timeZoneId.Equals("(GMT+05.00) Islamabad / Karachi / Tashkent"))
                id = "Pakistan Standard Time";

            // Any TZ with a "." will need to be handled outside of the "Replace(".", ":")" function above
            //
            if (timeZoneId.Equals("(GMT-01.00) Cape Verde Is."))
                id = "Cape Verde Standard Time";
            if (timeZoneId.Equals("(GMT+11.00) Magadan / Solomon Is. / New Caledonia"))
                id = "Central Pacific Standard Time";
            if (timeZoneId.Equals("(GMT+12.00) Fiji / Kamchatka / Marshall Is."))
                id = "Fiji Standard Time";
            if (timeZoneId.Equals("(GMT+03.00) Moscow / St. Petersburg / Volgograd"))
                id = "Russian Standard Time";

            // (GMT) Greenwich Mean Time : Dublin, Edinburgh, Lisbon, London
            if (timeZoneId.Equals("(GMT) Greenwich Mean Time - Dublin / Edinburgh / Lisbon / London"))
                id = "GMT Standard Time";


            try
            {
                return (TimeZoneInfo.FindSystemTimeZoneById(id));
            }
            catch (TimeZoneNotFoundException e)
            {
                log.Warn("Searched for " + id, e);
            }

            #endregion


            foreach (TimeZoneInfo t in TimeZoneInfo.GetSystemTimeZones())
            {
                log.Error("system time zone: " + t.Id + "(Id) " + t.DisplayName + "(DisplayName)");
            }

            throw new HarnessException("Unable to match TimeZone ID: " + timeZoneId);
        }

        // For a given year, determine the actual DateTime that the transition occurs on
        public static DateTime GetDaylightTransitionDateTime(TimeZoneInfo.TransitionTime transition, int year)
        {

            Calendar cal = CultureInfo.CurrentCulture.Calendar;

            // Get first day of week for transition
            // For example, the 3rd week starts no earlier than the 15th of the month
            int startOfWeek = transition.Week * 7 - 6;

            // What day of the week does the month start on?
            int firstDayOfWeek = (int)cal.GetDayOfWeek(new DateTime(year, transition.Month, startOfWeek));

            // Determine how much start date has to be adjusted
            int transitionDay;
            int changeDayOfWeek = (int)transition.DayOfWeek;

            if (firstDayOfWeek <= changeDayOfWeek)
                transitionDay = startOfWeek + (changeDayOfWeek - firstDayOfWeek);
            else
                transitionDay = startOfWeek + (7 - firstDayOfWeek + changeDayOfWeek);

            // Adjust for months with no fifth week
            if (transitionDay > cal.GetDaysInMonth(year, transition.Month))
                transitionDay -= 7;

            return (new DateTime(year, transition.Month, transitionDay, transition.TimeOfDay.Hour, transition.TimeOfDay.Minute, transition.TimeOfDay.Second));

        }


    }
}
