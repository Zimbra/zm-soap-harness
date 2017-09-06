#include "stdafx.h"
#include "util.h"


//zimbra profile parameters
	//the name of the server -> what server to connect to (or ip address)
#define PR_ZIMBRA_PROFILE_SERVER_NAME				PROP_TAG(PT_TSTRING,	(BASE_PROVIDER_ID + 0x0040))
#define PR_ZIMBRA_PROFILE_SERVER_NAME_A				PROP_TAG(PT_STRING8,	(BASE_PROVIDER_ID + 0x0040))
#define PR_ZIMBRA_PROFILE_SERVER_NAME_W				PROP_TAG(PT_UNICODE,	(BASE_PROVIDER_ID + 0x0040))
	//the port to connect to -> http(80) https(443) etc..
#define PR_ZIMBRA_PROFILE_SERVER_PORT				PROP_TAG(PT_TSTRING,	(BASE_PROVIDER_ID + 0x0043))
#define PR_ZIMBRA_PROFILE_SERVER_PORT_A				PROP_TAG(PT_STRING8,	(BASE_PROVIDER_ID + 0x0043))
#define PR_ZIMBRA_PROFILE_SERVER_PORT_W				PROP_TAG(PT_UNICODE,	(BASE_PROVIDER_ID + 0x0043))
	//should the connection be encrypted (not dictated by the port number)
#define PR_ZIMBRA_PROFILE_USE_SECURE_CONNECTION		PROP_TAG(PT_BOOLEAN,	(BASE_PROVIDER_ID + 0x0044))
	//the account to open (user1@domain.com)
#define PR_ZIMBRA_PROFILE_ACCOUNT_NAME				PROP_TAG(PT_TSTRING,	(BASE_PROVIDER_ID + 0x0041))
#define PR_ZIMBRA_PROFILE_ACCOUNT_NAME_A			PROP_TAG(PT_STRING8,	(BASE_PROVIDER_ID + 0x0041))
#define PR_ZIMBRA_PROFILE_ACCOUNT_NAME_W			PROP_TAG(PT_UNICODE,	(BASE_PROVIDER_ID + 0x0041))
	//the encrypted password for the account
#define PR_ZIMBRA_PROFILE_ACCOUNT_PWD				PROP_TAG(PT_UNICODE,		(BASE_PROVIDER_ID + 0x0042))
#define PR_ZIMBRA_PROFILE_ACCOUNT_PWD_A				PROP_TAG(PT_STRING8,		(BASE_PROVIDER_ID + 0x0042))

using namespace std;


extern "C" {
HRESULT CreateZCOProfile(
			char* szProfile,
			char* szServer,
			char* szPort,
			char* szUseSecure,
			char* szMailbox,
			char* szPassword
			);
}





HRESULT CreateZCOProfile(
			char* szProfile,
			char* szServer,
			char* szPort,
			char* szUseSecure,
			char* szMailbox,
			char* szPassword
			)
{
	HRESULT         hRes = S_OK;
    LPPROFADMIN     lpProfAdmin = NULL;
    LPSERVICEADMIN  lpSvcAdmin = NULL;
    LPMAPITABLE     lpMsgSvcTable = NULL;
    LPSRowSet       lpSvcRows = NULL;
    SPropValue      rgval[5];
    SRestriction    sres;
    SPropValue      SvcProps;

	MAPIInit g_mapiInit;

	BOOL bUseSecure	= FALSE;
	WCHAR wszPassword[MAX_PATH]; 

	//convert szPassword to unicode please
	MultiByteToWideChar( CP_ACP, 0, szPassword, -1, wszPassword, MAX_PATH );

	//convert useSecure to boolean
	bUseSecure = (strcmp(szUseSecure, "1")==0);

    // This indicates columns we want returned from HrQueryAllRows.
    enum {iSvcName, iSvcUID, cptaSvc};
    SizedSPropTagArray(cptaSvc,sptCols) = { cptaSvc, PR_SERVICE_NAME, PR_SERVICE_UID };


	if (FAILED(hRes = MAPIAdminProfiles(0, &lpProfAdmin)))
    {
        cout<<"Error getting IProfAdmin interface.";
        goto error;
    }

    if (FAILED(hRes = lpProfAdmin->CreateProfile((LPTSTR)szProfile, NULL, NULL, NULL)))
    {
        cout<<"Error creating profile.";
        goto error;
    }

    if (FAILED(hRes = lpProfAdmin->AdminServices((LPTSTR)szProfile, NULL, NULL, 0, &lpSvcAdmin)))
    {
        cout<<"Error getting IMsgServiceAdmin interface.";
        goto error;
    }

#ifndef BLACKBERRY
	if (FAILED(hRes = lpSvcAdmin->CreateMsgService((LPTSTR)"CONTAB", NULL, NULL, 0L)))
	{
		cout<<"Error creating CONTAB msg service";
		goto error;
	}
#endif

	//LSMS = Liquid Systems Messaging Service
	//eventually we will change it to ZMS
    if (FAILED(hRes = lpSvcAdmin->CreateMsgService((LPTSTR)"LSMS\0", NULL, NULL, NULL)))
    {
        cout<<"Error creating zimbra message service.";
        goto error;
    }

    if (FAILED(hRes = lpSvcAdmin->GetMsgServiceTable(0, &lpMsgSvcTable)))
    {
        cout<<"Error getting Message Service Table.";
        goto error;
    }
    sres.rt = RES_CONTENT;
    sres.res.resContent.ulFuzzyLevel = FL_FULLSTRING;
    sres.res.resContent.ulPropTag = PR_SERVICE_NAME_A;
    sres.res.resContent.lpProp = &SvcProps;

    SvcProps.ulPropTag = PR_SERVICE_NAME_A;
    SvcProps.Value.lpszA = "LSMS";

    if (FAILED(hRes = HrQueryAllRows(lpMsgSvcTable, (LPSPropTagArray)&sptCols, &sres, NULL, 0, &lpSvcRows)))
    {
        cout<<"Error querying table for new message service.";
        goto error;
    }

    // the server name.
    ZeroMemory(&rgval[0], sizeof(SPropValue) );
    rgval[0].ulPropTag = PR_ZIMBRA_PROFILE_SERVER_NAME_A;
    rgval[0].Value.lpszA = szServer;

    // server port
    ZeroMemory(&rgval[1], sizeof(SPropValue) );
    rgval[1].ulPropTag = PR_ZIMBRA_PROFILE_SERVER_PORT_A;
    rgval[1].Value.lpszA = szPort;

	// use SSL?
    ZeroMemory(&rgval[2], sizeof(SPropValue) );
    rgval[2].ulPropTag = PR_ZIMBRA_PROFILE_USE_SECURE_CONNECTION;
    rgval[2].Value.b = bUseSecure == TRUE;

    // account name
    ZeroMemory(&rgval[3], sizeof(SPropValue) );
    rgval[3].ulPropTag = PR_ZIMBRA_PROFILE_ACCOUNT_NAME_A;
    rgval[3].Value.lpszA = szMailbox;

	ZeroMemory(&rgval[4], sizeof(SPropValue) );
#ifdef BLACKBERRY
    rgval[4].ulPropTag = PR_ZIMBRA_PROFILE_ACCOUNT_PWD_A;
    rgval[4].Value.lpszA = szPassword;
#else 
    rgval[4].ulPropTag = PR_ZIMBRA_PROFILE_ACCOUNT_PWD;
    rgval[4].Value.lpszW = wszPassword;
#endif

	if (FAILED(hRes = lpSvcAdmin->ConfigureMsgService(
        (LPMAPIUID)lpSvcRows->aRow->lpProps[iSvcUID].Value.bin.lpb, // Entry ID of service to configure.
        NULL,                                                       // Handle to parent window.
        0,                                                          // Flags.
        5,                                                          // Number of properties we are setting.
        rgval)))                                                    // Pointer to SPropValue array.
    {
        cout<<"Error configuring message service.";
        goto error;
    }

    goto cleanup;

error:
    cout<<" hRes = 0x"<<hex<<hRes<<dec<<endl;
    return hRes;

cleanup:
    // Clean up.
    if (lpSvcRows) FreeProws(lpSvcRows);
    if (lpMsgSvcTable) lpMsgSvcTable->Release();
    if (lpSvcAdmin) lpSvcAdmin->Release();
    if (lpProfAdmin) lpProfAdmin->Release();

	return hRes;
}

