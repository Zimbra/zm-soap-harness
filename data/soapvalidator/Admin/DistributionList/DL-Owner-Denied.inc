<t:tests xmlns:t="urn:zimbraTestHarness">
    <t:property name="member1.name" value="mem1.${TIME}.${COUNTER}@${defaultdomain.name}"/>
	<t:property name="member2.name" value="mem2.${TIME}.${COUNTER}@${defaultdomain.name}"/>
	<t:property name="dl.alias.name" value="alias1.${TIME}.${COUNTER}@${defaultdomain.name}"/>
	
	<t:property name="dl.newname" value="newname.${TIME}.${COUNTER}@${defaultdomain.name}"/>

	<t:property name="server.zimbraAccount" value="${owner.server}"/>
		
    <t:test >
        <t:request >
            <AuthRequest xmlns="urn:zimbraAccount">
                <account by="name">${owner.name}</account>
                <password>${defaultpassword.value}</password>
            </AuthRequest>
        </t:request>
        <t:response>
            <t:select path="//acct:AuthResponse/acct:authToken" set="authToken"/>
        </t:response>
    </t:test> 
	 
	 <t:test >
        <t:request >
            <GetDistributionListRequest xmlns="urn:zimbraAccount" needOwners="1" >
            	<dl by="id">${dl.id}</dl>
          	</GetDistributionListRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListResponse/acct:dl/acct:owners/acct:owner[@name='${owner.name}']" emptyset="1"/>
        </t:response>
    </t:test>
    
    <t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="name">${dl.name}</dl>
                 <action op="addMembers">
                 	<dlm>${member1.name}</dlm>
                 	<dlm>${member2.name}</dlm>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        	<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
        </t:response>
    </t:test> 
 
     <t:test >
        <t:request >
            <GetDistributionListMembersRequest xmlns="urn:zimbraAccount" >
            	<dl>${dl.name}</dl>
          	</GetDistributionListMembersRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListMembersResponse" />
        </t:response>
     </t:test>
         
      <t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="id">${dl.id}</dl>
                 <action op="removeMembers">
	               	<dlm>${member1.name}</dlm>
                 	<dlm>${member2.name}</dlm>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        		<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
        </t:response>
    </t:test> 
 
 
	<t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="id">${dl.id}</dl>
                 <action op="modify">
                 	<a n='zimbraDistributionListSubscriptionPolicy'>APPROVAL</a>
                 	<a n='zimbraDistributionListUnsubscriptionPolicy'>APPROVAL</a>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        		<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
        </t:response>
    </t:test>    

     <t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="id">${dl.id}</dl>
                 <action op="acceptSubsReq">
                 	 <subsReq op="subscribe" >${member.account.name}</subsReq>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        		<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
        </t:response>
    </t:test> 
      <t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="id">${dl.id}</dl>
                 <action op="acceptSubsReq">
                      <subsReq op="unsubscribe" >${member.account.name}</subsReq>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        		<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
        </t:response>
    </t:test> 
	 

         
    <t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="id">${dl.id}</dl>
                 <action op="addOwners">
                 	<owner type="usr" by="name">${ownernew.name}</owner>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        	     		<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
   
        </t:response>
    </t:test>      

    <t:test >
        <t:request >
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="id">${dl.id}</dl>
                 <action op="removeOwners">
                 	<owner type="usr" by="name">${ownernew.name}</owner>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        		<t:select path="//zimbra:Code" match="service.PERM_DENIED"/>
           </t:response>
    </t:test>      
 
    
 
         
	    
	    
  </t:tests>