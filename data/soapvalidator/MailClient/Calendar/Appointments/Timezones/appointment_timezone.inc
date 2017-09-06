<t:tests xmlns:t="urn:zimbraTestHarness">


<!--

Assumptions:

1. Set server.zimbraAccount to the server to be used
2. account.name and account.password will be used to log in
3. Set appointment.timezone to the time zone of the appointment
4. Set appointment.start to the start time of the appointment (local time)
5. Set appointment.start.gmt to the start time of the appointment (GMT)

-->

    <t:test>
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

	<t:property name="appointment.name" value="name${TIME}${COUNTER}"/>


    <t:test>
        <t:request>
            <CreateAppointmentRequest xmlns="urn:zimbraMail">
                <m>
                    <inv method="REQUEST"
							type="event"
							fb="B"
							transp="O"
							allDay="0"
							name="${appointment.name}"
							loc="loc${TIME}${COUNTER}">
                        <s d="${ICALTIME[${appointment.start}]}" tz="${appointment.timezone}"/>
                        <e d="${ICALTIME(+1h)[${appointment.start}]}" tz="${appointment.timezone}"/>
                        <or a="${account.name}"/>
                    </inv>
                    <mp content-type="text/plain">
                        <content>content${TIME}${COUNTER}</content>
                    </mp>
                    <su>${appointment.name}</su>
                </m>
            </CreateAppointmentRequest>
        </t:request>
        <t:response>
            <t:select path="//mail:CreateAppointmentResponse" attr="apptId" set="appointment.apptId"/>
        </t:response>
    </t:test>

    <t:test >
        <t:request>
            <SearchRequest xmlns="urn:zimbraMail" calExpandInstStart="${TIME(-1m)[${appointment.start.gmt}]}" calExpandInstEnd="${TIME(+61m)[${appointment.start.gmt}]}" types="appointment">
            	<query>${appointment.name}</query>
            </SearchRequest>
        </t:request>
        <t:response>
            <t:select path="//mail:SearchResponse/mail:appt[@name='${appointment.name}']"  attr="id" set="appointment.id"/>
        </t:response>
    </t:test>

    <t:test >
        <t:request> 
            <GetAppointmentRequest  xmlns="urn:zimbraMail" id="${appointment.id}"/>
        </t:request>
        <t:response>
            <t:select path="//mail:GetAppointmentResponse">
            	<t:select path="//mail:s" attr="d" match="${ICALTIME[${appointment.start}]}"/>
            	<!-- t:select path="//mail:s" attr="tz" match="${appointment.timezone}"/ -->
            	<t:select path="//mail:e" attr="d" match="${ICALTIME(+1h)[${appointment.start}]}"/>
            	<!-- t:select path="//mail:e" attr="tz" match="${appointment.timezone}"/ -->
            </t:select>
        </t:response>
    </t:test>


</t:tests>
