<t:tests xmlns:t="urn:zimbraTestHarness">

<!--

Assumptions:

1. Set server.zimbraAdmin to the admin server to be used
2. admin.user and admin.password (from global.properties) will be used to log in as admin
3. Set account.name to the account name to be backed up
3. Set account.id to the account name to be backed up

Sets:

1. incremental.label is set to the backup label that is created
1. restore.label is set to the backup label that is restored

-->


<!-- remember these values so they can be reset later -->
<t:property name="BackupWorkflowIncrementalDeleteRestore.authToken" value="${authToken}"/>


	
	
	<t:test  >
	    <t:request>
	        <AuthRequest xmlns="urn:zimbraAdmin">
	            <name>${admin.user}</name>
	            <password>${admin.password}</password>
	        </AuthRequest>
	    </t:request>
	    <t:response>
	        <t:select path="//admin:AuthResponse/admin:authToken" set="authToken"/>
	    </t:response>
	</t:test>

<t:test>
	<t:request>
		<GetAccountRequest xmlns="urn:zimbraAdmin">
			<account by="name">${account.name}</account>
		</GetAccountRequest>
	</t:request>
	<t:response>
		<t:select path="//admin:GetAccountResponse/admin:account">
			<t:select path="//admin:a[@n='zimbraMailHost']" set="zimbraMailHost.server"/>
			
		</t:select>
	</t:response>
</t:test>

<t:property name="server.temp" value="${adminServer.name}"/>
<t:property name="adminServer.name" value="${zimbraMailHost.server}"/>
<t:property name="server.zimbraAdmin" value="${zimbraMailHost.server}"/>



<t:test  >
    <t:request>
        <AuthRequest xmlns="urn:zimbraAdmin">
            <name>${admin.user}</name>
            <password>${admin.password}</password>
        </AuthRequest>
    </t:request>
    <t:response>
        <t:select path="//admin:AuthResponse/admin:authToken" set="authToken"/>
    </t:response>
</t:test>

    <t:test >
        <t:request>
            <BackupRequest xmlns="urn:zimbraAdmin">
                <backup method="incremental" sync="1" >
                    <account name="${account.name}"/>
                </backup>
            </BackupRequest>
        </t:request>
        <t:response>
            <!-- Bug 8901: incr-label may not be returned if the server determine that it is not required -->
			<!-- t:select path="//admin:BackupResponse/admin:backup" attr="incr-label" set="incremental.label"/ -->
            <t:select path="//admin:BackupResponse/admin:backup"/>
        </t:response>
    </t:test>

    <t:test >
        <t:request>
            <DeleteAccountRequest xmlns="urn:zimbraAdmin">
                <id>${account.id}</id>
            </DeleteAccountRequest>
        </t:request>
        <t:response>
			<t:select path="//admin:DeleteAccountResponse" />
        </t:response>
    </t:test>

	<!-- Bug 8901: incr-label may not be returned if the server determine that it is not required -->
	<!-- t:property name="restore.label" value="${incremental.label}"/ -->

	<t:test>
	    <t:request>
	        <RestoreRequest xmlns="urn:zimbraAdmin">
	            <!--restore includeIncrementals="1" method="ra" replayRedo="0" label="${restore.label}"-->
	            <restore includeIncrementals="1" method="ra" replayRedo="0" >
	                <account name="${account.name}"/>                    
	            </restore>
	        </RestoreRequest>
	    </t:request>
	    <t:response>
			<t:select path="//admin:RestoreResponse"/>
	    </t:response>
	</t:test> 





<!-- reset these values to their original value -->
<t:property name="adminServer.name" value="${server.temp}"/>
<t:property name="authToken" value="${BackupWorkflowIncrementalDeleteRestore.authToken}"/>


</t:tests>

