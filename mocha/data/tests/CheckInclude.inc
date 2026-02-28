<t:tests xmlns:t="urn:zimbraTestHarness">

<t:property name="server.zimbraAdmin" value="${zimbraServer.name}"/>

    
<t:test >
    <t:request>
        <PingRequest xmlns="urn:zimbraAdmin"/>
    </t:request>
    <t:response>
        <t:select path="//admin:PingResponse"/>
    </t:response>
</t:test>

</t:tests>
