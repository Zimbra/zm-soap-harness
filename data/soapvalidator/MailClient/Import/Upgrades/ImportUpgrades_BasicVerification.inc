<t:tests xmlns:t="urn:zimbraTestHarness">


<!--

Assumptions:

1. Set account.server to the account server to be used
2. Set account.name to the account name to be used
3. Set account.id to the account name to be used
3. Set account.password to the account name to be used
4. Import the TGZ data into the account

Steps:

1. Auth as the account
2. Search for message1

-->


<!-- remember these values so they can be reset later -->
<t:property name="ImportUpgrades_BasicMessageVerification.authToken" value="${authToken}"/>



<t:property name="message1.subject"			value="subject12472596949804"/>		<!-- basic message in the inbox -->

<t:property name="message2A.subject"		value="email02A"/>		<!-- X-Zimbra-Received: Sun, 15 May 2005 10:00:00 -0700 -->
<t:property name="message2B.subject"		value="email02B"/>		<!-- X-Zimbra-Received: Wed, 1 Jun 2005 10:00:00 -0700 -->
<t:property name="message2C.subject"		value="email02C"/>		<!-- X-Zimbra-Received: Wed, 15 Jun 2005 10:00:00 -0700 -->


<t:property name="message4A.subject"		value="email04A"/>		<!-- no attachment -->
<t:property name="message4B.subject"		value="email04B"/>		<!-- PDF attachment -->
<t:property name="message4C.subject"		value="email04C"/>		<!-- TAR attachment -->
<t:property name="message4F.subject"		value="email04F"/>		<!-- TXT attachment -->
<t:property name="message4G.subject"		value="email04G"/>		<!-- HTML attachment -->
<t:property name="message4H.subject"		value="email04H"/>		<!-- RTF attachment -->
<t:property name="message4J.subject"		value="email04J"/>		<!-- JPG attachment -->
<t:property name="message4K.subject"		value="email04K"/>		<!-- GIF (inline) attachment -->
<t:property name="message4L.subject"		value="email04L"/>		<!-- XLS attachment -->
<t:property name="message4M.subject"		value="email04M"/>		<!-- PPT attachment -->
<t:property name="message4N.subject"		value="email04N"/>		<!-- DOC attachment -->
<t:property name="message4O.subject"		value="email04O"/>		<!-- ZIP attachment -->
<t:property name="message4P.subject"		value="email04P"/>		<!-- PDF attachment -->


<t:property name="message5.subject"			value="tagged"/>		<!-- tagged message (tag3.name & tag4.name)-->
<t:property name="message6.subject"			value="untagged"/>		<!-- untagged message -->

<t:property name="message7.subject"			value="flagged"/>		<!-- flagged message -->
<t:property name="message8.subject"			value="unflagged"/>		<!-- unflagged message -->

<t:property name="message9.subject"			value="read"/>			<!-- read message -->
<t:property name="message10.subject"		value="unread"/>		<!-- unread message -->

<t:property name="message11.subject"		value="replied"/>		<!-- replied message -->
<t:property name="message12.subject"		value="forwarded"/>		<!-- forwarded message -->

<t:property name="conversation1.subject"	value="conversation12490671884769"/>			<!-- sample conversation -->
<t:property name="conversation1.message1.content"	value="content124906718847692"/>		<!-- sample conversation -->
<t:property name="conversation1.message2.content"	value="content124906718847691"/>		<!-- sample conversation -->
<t:property name="conversation1.message3.content"	value="content124906718847692"/>		<!-- sample conversation -->

<t:property name="folder1.name"					value="Subfolder12472596949800"/>			<!-- subfolder in inbox with messages-->
<t:property name="folder1.message1.subject"		value="subject12472596949805"/>				<!-- message in subfolder -->
<t:property name="folder1.message2.subject"		value="subject12472596949801"/>				<!-- message in subfolder -->

<t:property name="folder2.name"					value="Subfolder12472596949801"/>			<!-- subfolder in inbox (empty) -->

<t:property name="folder3a.name"				value="Subfolder12472596949802a"/>			<!-- subfolder in inbox (empty) -->
<t:property name="folder3a.message1.subject"	value="subject12472596949803"/>				<!-- message in subfolder -->
<t:property name="folder3b.name"				value="Subfolder12472596949802b"/>			<!-- subfolder in subfolder -->
<t:property name="folder3b.message1.subject"	value="subject12472596949802"/>				<!-- message in subfolder -->

<t:property name="folder4.name"					value="Subfolder12472596949804"/>			<!-- subfolder in sent -->
<t:property name="folder4.message1.subject"		value="Subject12472596949811"/>				<!-- message in subfolder -->

<t:property name="folder5.name"					value="Subfolder12472596949805"/>			<!-- subfolder in trash -->
<t:property name="folder5.message1.subject"		value="subject12472596949821"/>				<!-- message in subfolder -->

<t:property name="folder6.name"					value="Subfolder12472596949803"/>			<!-- subfolder in USER_ROOT -->

<t:property name="tag1.name"					value="BlueTag"/>			<!-- Bug Tag -->
<t:property name="tag2.name"					value="RedTag"/>			<!-- Orange Tag -->
<t:property name="tag3.name"					value="Tag12490654180171"/>			<!-- Tag used for message5.subject -->
<t:property name="tag4.name"					value="Tag12490654180172"/>			<!-- Tag used for message5.subject -->

<t:property name="contact1.email"		value="email12491671884769@domain.com"/>	<!-- basic contact in Contacts folder -->
<t:property name="contact2.email"		value="admin@qa01.lab.zimbra.com"/>			<!-- contact in Emailed Contacts folder -->
<t:property name="contact3.email"		value="foo@example"/>						<!-- contact in Trash folder -->

<t:property name="appointment1.subject"			value="BasicAppointment12478634872440"/>	<!-- Basic appointment in Calendar folder on 8/5/09 -->

<t:property name="calendar1.name"					value="SubCalendar12478634872451"/>			<!-- subfolder in USER_ROOT with appointments -->
<t:property name="calendar1.appointment1.subject"	value="BasicAppointment12478634872442"/>	<!-- Basic appointment in Calendar subfolder on 8/5/09 -->

<t:property name="appointment2.subject"			value="AllDayAppointment12478634872441"/>	<!-- All Day appointment in Calendar on 8/6/09 -->
<t:property name="appointment3.subject"			value="MonthlyBasicAppointment12478634872430"/>	<!-- Monthly occuring appointment starting on 9/1/2009 -->
<t:property name="appointment4.subject"			value="EveryDayBasicAppointment12478634872431"/>	<!-- Daily occuring appointment starting on 9/7/2009 -->

<t:property name="appointment5.subject"			value="EveryDayBasicAppointment12478634872431"/>	<!-- Daily occuring appointment starting on 9/7/2009 -->
<t:property name="appointment5.exception.subject"			value="ExceptionEveryDayBasicAppointment12478634872431"/>	<!-- Exception on 9/9/2009 -->

<t:property name="task1.subject"			value="Task12477644872431"/>	<!-- Basic Task -->
<t:property name="task2.subject"			value="Task12477644872432"/>	<!-- Basic Task -->

<t:property name="folder1.name"				value="TaskList12477634872431"/>	<!-- Task folder in USER_ROOT -->
<t:property name="folder1.task1.subject"	value="Task12477644872433"/>		<!-- Basic task in task folder -->

<t:property name="page1.subject"			value="Page11477644872431"/>		<!-- Basic page in Notebook folder -->

<t:property name="notebook1.name"			value="Notebook11477644872431"/>	<!-- Notebook subfolder in Notebook -->
<t:property name="notebook1.page1.subject"	value="Page11477544872431"/>		<!-- Basic page in notebook subfolder -->

<t:property name="notebook1.name"			value="Notebook11477544872432"/>	<!-- Notebook subfolder in Notebook (empty)-->


	<t:property name="server.zimbraAccount" value="${account.server}"/>

	<t:test required="true">
		<t:request>
			<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account.name}</account>
				<password>${account.password}</password>
			</AuthRequest>
		</t:request>
		<t:response>
			<t:select path="//acct:AuthResponse/acct:authToken" set="authToken"/>
		</t:response>
	</t:test>

	<t:test>
		<t:request>
			<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${message1.subject})</query>
			</SearchRequest>
		</t:request>
		<t:response>
			<t:select path="//mail:SearchResponse/mail:m" attr="id" set="message1.id"/>
		</t:response>
	</t:test>

<t:property name="authToken" value="${ImportUpgrades_BasicMessageVerification.authToken}"/>


</t:tests>
