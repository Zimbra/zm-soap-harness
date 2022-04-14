package com.zimbra.qa.importer;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;


public class ParserBase {

    // General debug logger
	private static Logger mLog = LogManager.getLogger(ParserBase.class.getName());

    protected String InputFile = null;
    protected List<String> SkippedAttributes = null;
	
	public ParserBase(String inputFile) {
		InputFile = new String(inputFile);
		SkippedAttributes = new ArrayList<String>();
	}
	
	public boolean parseInputLine(String line) {
		return (false);
	}
	
	static Pattern pattern = Pattern.compile("(^zimbra.*): (.*$)", Pattern.MULTILINE);
	
	public HashMap<String, Object> parseInputFile() throws IOException {
		mLog.debug("ParserBase.parseInputFile()");

		HashMap<String, Object> attrs = new HashMap<String, Object>();
		
		Matcher matcher = pattern.matcher(fromFile(InputFile));
		while (matcher.find()) {
			String key = matcher.group(1);
			String value = matcher.group(2);
			if ( (key != null) && (value != null) ) {
				
				if ( attrs.containsKey(key) ) {
					mLog.warn("Duplicate key: "+key);

					Object o = attrs.get(key);
					if ( o instanceof String ) {
						String[] v = { (String)o, value };
						attrs.put(key, v);
					} else if ( o instanceof String[] ){
						List<String> temp = new ArrayList<String>();
						for ( String s : (String [])o ) {
							temp.add(s);
						}
						temp.add(value);
						attrs.put(key, temp.toArray());
					}
				} else {
					attrs.put(key, value);					
				}
				
				
			}
		}
				
		return (attrs);
	}
	
	
	// Convert file content to a CharSequence for regex processing
	protected CharSequence fromFile(String filename) throws IOException {
		FileInputStream fis = new FileInputStream(filename);
		FileChannel fc = fis.getChannel();
		ByteBuffer byteBuffer = fc.map(FileChannel.MapMode.READ_ONLY, 0, (int)fc.size());
        CharBuffer charBuffer = Charset.forName("8859_1").newDecoder().decode(byteBuffer);
        return charBuffer;
    }
	
}
