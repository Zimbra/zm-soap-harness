package com.zimbra.qa.nunit;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Date;
import java.util.Properties;

public class NunitController {

	public static String pLogDirectory;
	public static String pZimbraServer;
	public static String pZimbraQARoot;
	private static ArrayList<String> pDLLs = null;
	public static String pPackage;
	public static String pTestCase;
	public static ArrayList<String> pAreas;
	public static ArrayList<String> pExcludes;
	public static String pSuite;
	public static String pBits;
	
	public static final String nunitConsole = "nunit-console.exe";
	public static final String outlook = "OUTLOOK.EXE";
	public static final String taskkill = "taskkill.exe";
	public static final String zcoDLL = "clientTests.dll";

	private boolean isRunning = false;;
	private StringBuilder statusSB;
	
	public boolean isExecuting() {
		return (isRunning);
	}
	
	private String killProcess(String processName) {
		
		StreamGobbler gobbler = null;
		
		try {
			String[] command = new String[3];
			command[0] = "cmd.exe";
			command[1] = "/C";
			command[2] = String.format("%s /F /T /IM %s", taskkill, processName);
			
			ProcessBuilder pb = new ProcessBuilder(command);
			pb.directory(new File("/opt/qa/synclient"));
			pb.redirectErrorStream(true);
			
			// Execute the command
			Process taskkill = pb.start();
			gobbler = new StreamGobbler(taskkill.getInputStream());
			gobbler.start();
			
			taskkill.waitFor();
			
		} catch (IOException e) {
			return (e.getMessage());
		} catch (InterruptedException e) {
			return (e.getMessage());
		}
		
		return (gobbler.getOutput());
	}
		
	public String stopExecution() {
		StringBuilder sb = new StringBuilder();
		// sb.append(killProcess(outlook)).append('\n');
		sb.append(killProcess(nunitConsole)).append('\n');
		return (sb.toString());
	}
	
	public String execute() throws IOException, InterruptedException {
		
		if ( isRunning )
			return ("Already Running");
		
		isRunning = true;
		statusSB = new StringBuilder();
		
		try 
		{
			
			// Set the environment
			configureEnvironment();

			// Execute each DLL
			for (String dll : pDLLs) {
				
				statusSB.append("+---------------\n");
				statusSB.append("Running command:\n");
				statusSB.append(String.format("%s %s /xml:%s\\Results.xml /output:%s\\console.txt", nunitConsole, dll, pLogDirectory, pLogDirectory));
				statusSB.append("\n\n");

				// Build the command
				ProcessBuilder pb = new ProcessBuilder(nunitConsole, dll, "/xml:" + pLogDirectory + "\\Results.xml", "/output:" + pLogDirectory + "\\console.txt");
				pb.directory(new File("/opt/qa/synclient"));
				pb.redirectErrorStream(true);
				
				// Execute the command
				Process p = pb.start();
				
				StreamGobbler gobbler = new StreamGobbler(p.getInputStream());
				gobbler.start();
				
				p.waitFor();
				statusSB.append(gobbler.getOutput());

				statusSB.append("\n\n");
				statusSB.append("+---------------\n");

			}
			
			
		} finally {
			stopExecution();	// Force cleanup
			isRunning = false;
		}
		
		return (statusSB.toString());


	}
	
	private void configureEnvironment() throws FileNotFoundException, IOException {
		
		// Make sure the log folder exists
    	File path = new File(pLogDirectory);
    	path.mkdirs();
    					
		Properties props = new Properties();
		props.put("ZimbraServer", pZimbraServer);
		props.put("ZimbraQARoot", pZimbraQARoot);
		props.put("ZimbraLogRoot", pLogDirectory);
		props.put("SyncClientType", "outlookZCO");
		props.put("SyncClientVersion", "latest");
		props.put("SyncClientInstall", "true");
		
		FileOutputStream fos = null;
		try
		{
			fos = new FileOutputStream(String.format("%s/conf/SyncClient/staf.properties", pZimbraQARoot));
			props.store(fos, "STAF Test Execution at "+ (new Date()).toString());
		} finally {
			if ( fos != null )
				fos.close();
		}
	}
	
	public static NunitController getInstance() {
		return (INSTANCE);
	}
	
	private static final NunitController INSTANCE = new NunitController();
	
	private NunitController() {
		isRunning = false;
		
		pDLLs = new ArrayList<String>();
		pDLLs.add("clientTests.dll");
		
	}

	
	
	class StreamGobbler extends Thread
	{
		private InputStream stream;
		StringBuilder sb = new StringBuilder();

		public StreamGobbler(InputStream is)
		{
			this.stream = is;
		}

		public String getOutput() {
			return (sb.toString());
		}
		
		public void run()
		{
			try
			{
				InputStreamReader isr = new InputStreamReader(stream);
				BufferedReader br = new BufferedReader(isr);
				String line=null;
				while ( (line = br.readLine()) != null)
					sb.append(line).append('\n');
			} catch (IOException ioe) {
				ioe.printStackTrace();  
			}
		}
	}

}
