using System;
using System.Collections.Generic;
using System.Text;
using System.IO;

namespace NewPSTDataTests.Harness
{
    class FileParser
    {
        public static List<string[]> Parse(string path)
        {
            List<string[]> parsedData = new List<string[]>();

            try
            {
                using (StreamReader readFile = new StreamReader(path))
                {
                    string line;
                    string[] row;

                    while ((line = readFile.ReadLine()) != null)
                    {
                        row = line.Split(',');
                        parsedData.Add(row);
                    }
                    readFile.Close();
                }
            }
            catch (Exception e)
            {
                //MessageBox.Show(e.Message);
            }

            return parsedData;
        }
    }
}
