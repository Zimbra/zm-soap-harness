<t:tests xmlns:t="urn:zimbraTestHarness">
    <t:property name="member1.name" value="mem1.${TIME}.${COUNTER}@${defaultdomain.name}"/>
	<t:property name="member2.name" value="mem2.${TIME}.${COUNTER}@${defaultdomain.name}"/>
	<t:property name="dl.alias.name" value="alias1.${TIME}.${COUNTER}@${defaultdomain.name}"/>
	

	<t:property name="server.zimbraAccount" value="${owner.server}"/>
		
    <t:test>
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
        <t:request>
            <GetDistributionListRequest xmlns="urn:zimbraAccount" needOwners="1" >
            	<dl by="id">${dl.id}</dl>
          	</GetDistributionListRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListResponse" />
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test> 
 
     <t:test >
        <t:request >
            <GetDistributionListMembersRequest xmlns="urn:zimbraAccount" >
            	<dl>${dl.name}</dl>
          	</GetDistributionListMembersRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListMembersResponse/acct:dlm" match="${member1.name}" />
			<t:select path="//acct:GetDistributionListMembersResponse/acct:dlm" match="${member2.name}" />
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test> 
 
 	<t:test>
        <t:request >
            <GetDistributionListMembersRequest xmlns="urn:zimbraAccount" >
            	<dl>${dl.name}</dl>
          	</GetDistributionListMembersRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListMembersResponse/acct:dlm" match="${member1.name}"  emptyset="1"/>
			<t:select path="//acct:GetDistributionListMembersResponse/acct:dlm" match="${member2.name}" emptyset="1" />
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test>    

	<t:property name="server.zimbraAccount" value="${member.account.server}"/>

    <t:test >
        <t:request >
            <AuthRequest xmlns="urn:zimbraAccount">
                <account by="name">${member.account.name}</account>
                <password>${defaultpassword.value}</password>
            </AuthRequest>
        </t:request>
        <t:response>
            <t:select path="//acct:AuthResponse/acct:authToken" set="authToken"/>
        </t:response>
    </t:test> 
    
     <t:test >
        <t:request>
            <SubscribeDistributionListRequest  xmlns="urn:zimbraAccount" op="subscribe">
  				<dl by="name">${dl.name}</dl>
			</SubscribeDistributionListRequest>
        </t:request>
        <t:response>
            <t:select path="//acct:SubscribeDistributionListResponse" />
        </t:response>
    </t:test> 

	
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
    
    <t:test>
        <t:request>
            <SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>${dl.name}</query>
            </SearchRequest>
        </t:request>
        <t:response>
            <t:select path="//mail:SearchResponse/mail:m"  attr="id" set="sub1.id">
            </t:select>
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test> 
      <t:test >
        <t:request >
            <GetDistributionListMembersRequest xmlns="urn:zimbraAccount" >
            	<dl>${dl.name}</dl>
          	</GetDistributionListMembersRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListMembersResponse/acct:dlm" match="${member.account.name}"/>
        </t:response>
        </t:test>
    
    	<t:property name="server.zimbraAccount" value="${member.account.server}"/>

    <t:test >
        <t:request >
            <AuthRequest xmlns="urn:zimbraAccount">
                <account by="name">${member.account.name}</account>
                <password>${defaultpassword.value}</password>
            </AuthRequest>
        </t:request>
        <t:response>
            <t:select path="//acct:AuthResponse/acct:authToken" set="authToken"/>
        </t:response>
    </t:test> 
    
    <t:test >
        <t:request >
            <GetAccountDistributionListsRequest xmlns="urn:zimbraAccount" />
        </t:request>
       <t:response>
        	<t:select path="//acct:GetAccountDistributionListsResponse/acct:dl" attr="name" match="${dl.name}"/>
        	<t:select path="//acct:GetAccountDistributionListsResponse/acct:dl" attr="id" match="${dl.id}"/>
       </t:response>
    </t:test> 
    
    <t:test >
        <t:request>
            <SubscribeDistributionListRequest  xmlns="urn:zimbraAccount" op="unsubscribe">
  				<dl by="name">${dl.name}</dl>
			</SubscribeDistributionListRequest>
        </t:request>
        <t:response>
            <t:select path="//SubscribeDistributionListResponse" attr="status" match="awaiting_approval" />
        </t:response>
    </t:test> 
    
    
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
    
    <t:test>
        <t:request>
            <SearchRequest xmlns="urn:zimbraMail" types="message">
                <query>${dl.name}</query>
            </SearchRequest>
        </t:request>
        <t:response>
            <t:select path="//mail:SearchResponse/mail:m"  attr="id" set="sub1.id">
            </t:select>
        </t:response>
    </t:test>
    
	<t:property name="subscription.message.part"  value='&lt;dlSubs xmlns="urn:zimbraDLSubscription" version="0.1" action="subscribe"&gt; &lt;dl id="${dl.id}" email="${dl.name}" name=""//&gt; &lt;user id="${member.account.id}" email="${member.account.name}" name=""//&gt; &lt;/dlSubs&gt;' />
	  
<!--     <t:test>-->
<!--        <t:request>-->
<!--    	<GetMsgRequest  xmlns="urn:zimbraMail">-->
<!-- 			<m id="${sub1.id}"/>-->
<!--		</GetMsgRequest>-->
<!--        </t:request>-->
<!--        <t:response>-->
<!--        <t:select path="//mail:dlSubs/mail:content" set="a" />-->

<!--        </t:response>-->
<!--    </t:test>-->
<!--    <t:echo>${a}</t:echo>-->
<!--    -->
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test> 
      <t:test >
        <t:request >
            <GetDistributionListMembersRequest xmlns="urn:zimbraAccount" >
            	<dl>${dl.name}</dl>
          	</GetDistributionListMembersRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListMembersResponse/acct:dlm" match="${member.account.name}" emptyset="1"/>
        </t:response>
        </t:test>
    
    	<t:property name="server.zimbraAccount" value="${member.account.server}"/>

    <t:test >
        <t:request >
            <AuthRequest xmlns="urn:zimbraAccount">
                <account by="name">${member.account.name}</account>
                <password>${defaultpassword.value}</password>
            </AuthRequest>
        </t:request>
        <t:response>
            <t:select path="//acct:AuthResponse/acct:authToken" set="authToken"/>
        </t:response>
    </t:test> 
    
    <t:test >
        <t:request >
            <GetAccountDistributionListsRequest xmlns="urn:zimbraAccount" />
        </t:request>
       <t:response>
        	<t:select path="//acct:GetAccountDistributionListsResponse/acct:dl" attr="name" match="${dl.name}" emptyset="1"/>
        	<t:select path="//acct:GetAccountDistributionListsResponse/acct:dl" attr="id" match="${dl.id}" emptyset="1"/>
       </t:response>
    </t:test> 

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
            <DistributionListActionRequest xmlns="urn:zimbraAccount" >
            	<dl by="name">${dl.name}</dl>
                 <action op="rename" >
                 <newName>${dl.newname}</newName>
                 </action>
          	</DistributionListActionRequest>
        </t:request>
        <t:response>
        	<t:select path="//zimbra:Code" />
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test>      
         
   	 <t:test >
        <t:request >
            <GetDistributionListRequest xmlns="urn:zimbraAccount" needOwners="1" >
            	<dl by="id">${dl.id}</dl>
          	</GetDistributionListRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListResponse/acct:dl/acct:owners/acct:owner[@name='${ownernew.name}']" attr="id" match="${ownernew.id}"/>
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
        	<t:select path="//acct:DistributionListActionResponse" />
        </t:response>
    </t:test>      
         
   	 <t:test >
        <t:request >
            <GetDistributionListRequest xmlns="urn:zimbraAccount" needOwners="1" >
            	<dl by="id">${dl.id}</dl>
          	</GetDistributionListRequest>
        </t:request>
        <t:response>
			<t:select path="//acct:GetDistributionListResponse/acct:dl/acct:owners/acct:owner[@name='${ownernew.name}']" attr="id" match="${ownernew.id}" emptyset="1"/>
			<t:select path="//acct:GetDistributionListResponse/acct:dl" attr="name" match="${dl.name}" />
        </t:response>
    </t:test>
    
    

	    
	    
  </t:tests>