# Zimbra SOAP-Harness

## Introduction
This harness enables you to execute soap automation tests for supported functionality in FOSS

## Local setup (Windows/Mac):
1.	Install JDK 1.8 or higher
2.	Install Git client
3.	Install  Apache Ant 1.9 or higher https://ant.apache.org/bindownload.cgi 
4.	Install STAF (this works only on Windows OS. On Latest Mac, STAF is having compatibility issues).

	- Link to download STAF: http://staf.sourceforge.net/getcurrent.php
	
	- Install STAF: http://staf.sourceforge.net/current/STAFInstall.pdf 


5.	**Set Environment Variables:**

	***Windows:***
	- Right click on My Computer  icon > Properties >Advanced > Environment Variables > System Variables
	- Create new Variable as JAVA_HOME and give variable value as “C:\Program Files\Java\jdk1.8\bin” [Path of Java]
	- Create new Variable as ANT_HOME and give variable value as “Ant_path” [Path of Ant]
	- Under System Variables, find PATH, and click on it. > In the Edit windows, modify PATH by adding path of Java and path of ant, separated by ‘;’.

	***Mac:***
	```
	vi ~/.bash_profile
	export "JAVA_HOME=\$(/usr/libexec/java_home)"
	export "ANT_HOME=<Ant Home Path"
	export PATH=$PATH:<JAVA_HOME>/bin:<ANT_HOME>/bin

	source $HOME/.bash_profile
	```

6.	Clone the following repositories:
	```
	git clone https://github.com/Zimbra/zimbra-package-stub.git
	git clone https://github.com/Zimbra/zm-zcs.git
	git clone https://github.com/Zimbra/zm-mailbox.git
	git clone https://github.com/Zimbra/zm-soap-harness.git
	```
7.	Create a directory as ~/.ivy2/cache if not present under your user
8.	Create a directory as ~/.zcs-deps directory. Download ant-contrib-1.0b1.jar and copy to ~/.zcs-deps directory.
9.	Go to zm-mailbox directory and execute following command to generate necessary zimbra dependencies: 

	```ant clean-ant publish-local-all -Dzimbra.buildinfo.version=8.8.3_GA```
	
11.	Go to zm-soap-harness directory and run jar target to get zm-soap-harness jar

	```ant jar```
	
12.	To build soapdata.tar run the following target: 

	```ant build-soap-data-file```
	

## Tests Execution from Local Setup using STAF (will work on Windows, not on Mac):
1.	Start STAF service
2.	Make sure that STAF is running properly

	```staf local ping ping – should return pong response```

	vi STAF.cfg file (found in bin folder of STAF Install directory) and add trust level of 5 for local and Zimbra server:
	```
	trust machine local://local level 5
	trust machine 10.139.* level 5
	```

	Check staf ping to Zimbra server returns pong response:
	
	```staf <Zimbra server IP> ping ping ```

	Register below STAF services:
	```
	staf local service add service SOAP LIBRARY JSTAF EXECUTE <soap harness folder>/build/dist/lib/zimbrastaf.jar
	staf local service add service LOG LIBRARY STAFLog
	staf local service add service INJECT LIBRARY JSTAF EXECUTE <soap harness folder>/build/dist/lib/zimbrainject.jar
	```

	Verify STAF services are listed using below command:
	```staf local service list```

3.	Modify ```<soap harness folder>/conf/global.properties``` and point to Zimbra server.

	Assuming your zimbra server name is the same as the default domain name, and the admin password is test123, you need to modify all instances of 	zimbra.com to your default domain name and modify all instances of localhost to your default domain name.

4.	**Run Single testcase of type Smoke:**

	Note: zqa-225.eng.zimbra.com is Zimbra server.
	```
	STAF LOCAL soap EXECUTE zqa-225.eng.zimbra.com ZIMBRAQAROOT <soap harness folder> DIRECTORY <soap harness```			 ```folder>\data\soapvalidator\Admin\Auth\AdminAuth_basic.xml LOG C:\ SUITE SMOKE```

	Test Execution will be logged in C:\soapvalidator\Admin\Auth\AdminAuth_basic.txt

5.	**Run All the Smoke tests in folder Admin:**

	```STAF LOCAL soap EXECUTE zqa-225.eng.zimbra.com ZIMBRAQAROOT <soap harness folder> DIRECTORY <<soap harness folder>/data/soapvalidator/Admin/ LOG C:\ SUITE SMOKE```

6.	**Run All the Smoke tests:**

	```Nohup STAF LOCAL soap EXECUTE zqa-225.eng.zimbra.com ZIMBRAQAROOT <soap harness folder> DIRECTORY <<soap harness folder>/data/soapvalidator/ LOG C:\ SUITE SMOKE```
	
	Result will be stored in nohup.out file

## Tests Execution on Zimbra server using STAF:
### Setup:
- Install JDK 1.8 or higher
- Install  Apache Ant 1.9 or higher https://ant.apache.org/bindownload.cgi 
- Install STAF 
	- Link to download STAF: http://staf.sourceforge.net/getcurrent.php
	- Install STAF: http://staf.sourceforge.net/current/STAFInstall.pdf 

### Execution:
1.	Copy soapdata.tar to Zimbra server
2.	Extract soapdata.tar to /opt/qa/ using tar –xvf soapdata.tar command
3.	Edit /opt/qa/soapvalidator/conf/global.properties file, change domain/server values.

4.	Add below services:
	```
	staf local service add service SOAP LIBRARY JSTAF EXECUTE /opt/qa/soapvalidator/bin/zimbrastaf.jar
	staf local service add service LOG LIBRARY STAFLog
	staf local service add service INJECT LIBRARY JSTAF EXECUTE /opt/qa/soapvalidator/bin/zimbrainject.jar
	```

	Verify STAF services are listed using below command:
	
	```staf local service list```

5.	**Execute single test case on the setup:**
	```
	STAF LOCAL soap EXECUTE localhost ZIMBRAQAROOT /opt/qa/soapvalidator/ DIRECTORY /opt/qa/soapvalidator/data/soapvalidator/Admin/Auth/AdminAuth_basic.xml LOG /opt/ SUITE SMOKE
	```
	
	Test Execution will be logged in
 	```/opt/soapvalidator/Admin/Auth/AdminAuth_basic.txt```

6.	**Execute smoke suite:**

	```nohup STAF LOCAL soap EXECUTE localhost ZIMBRAQAROOT /opt/qa/soapvalidator/ DIRECTORY /opt/qa/soapvalidator/data/soapvalidator/ LOG /opt/ SUITE SMOKE &```

	To execute particular folder: 
	
	```nohup STAF LOCAL soap EXECUTE localhost ZIMBRAQAROOT /opt/qa/soapvalidator/ DIRECTORY /opt/qa/soapvalidator/data/soapvalidator/Admin/ LOG /opt/ SUITE SMOKE &```

Result will be stored under /root/nohup.out
