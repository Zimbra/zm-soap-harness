#include "stdafx.h"
#include "util.h"



using namespace std;


extern "C" {
HRESULT OpenOtherUsersMailbox(
			char* szUserProfile,
			char* szGalEntryID,
			wchar_t* szOtherUsersEmail,
			char* szOtherUsersGUID
			);
}


#define PR_SMTP_ADDRESS_W								PROP_TAG (PT_UNICODE,   0x39FE)
#define PR_ENTRY_ID                                     PROP_TAG (PT_BINARY,    0x0FFF)
#define PR_ZIMBRA_DELEGATE_USER_DISPLAY_NAME_W			PROP_TAG (PT_UNICODE,	0x6649)
#define PR_ZIMBRA_DELEGATE_USER_FULL_EMAIL_ADDRESS_W	PROP_TAG (PT_UNICODE,	0x6650)
#define PR_ZIMBRA_DELEGATE_USER_ID						PROP_TAG (PT_BINARY,	0x6651)
#define PR_ZIMBRA_DELEGATE_USER_ADDRESS_TYPE_W			PROP_TAG (PT_UNICODE,	0x6652)
#define PR_ZIMBRA_DELEGATE_USER_ENTRY_ID				PROP_TAG (PT_BINARY,    0x6653)



HRESULT OpenOtherUsersMailbox(
			char* szUserProfile,
			char* szGalEntryID,
			wchar_t* szOtherUsersEmail,
			char* szOtherUsersGUID
			)
{
	HRESULT         hRes = S_OK;

	WCHAR pwszMsg[256];
	WCHAR pwszDisplayName[MAX_PATH];

	MAPIInit g_mapiInit;

	ModuleContext context;
	context.Initialize((LPTSTR)szUserProfile);

	CComPtr<IMAPISession> pSession = context.GetSession();

	CComPtr<IProfAdmin> pProfAdmin ;
	hRes = MAPIAdminProfiles(0, &pProfAdmin) ;
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"Failed to retreive IProfAdmin interface. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes ;
	}

	CComPtr<IMsgServiceAdmin> pMsgServiceAdmin ;
	hRes = pProfAdmin->AdminServices((LPTSTR)szUserProfile, NULL, NULL, 0, &pMsgServiceAdmin) ;
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"Failed to retreive AdminServices interface for profile %ls. Error 0x%x", (LPTSTR)szUserProfile, hRes );		
		OutputDebugString( pwszMsg );
		return hRes ;
	}

	hRes = pMsgServiceAdmin->CreateMsgService((LPTSTR)"LSMS_Secondary", NULL, NULL, 0) ;
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"Failed to add Zimbra delegation service to the profile. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		// don't have to return
	}

	CComPtr<IMAPITable> pServiceTable;
	hRes = pMsgServiceAdmin->GetMsgServiceTable(0, &pServiceTable) ;
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"IMsgServiceAdmin::GetMsgServiceTable failed with error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes;
	}

	DWORD dwCount = 0 ;
	hRes = pServiceTable->GetRowCount(0, &dwCount) ;

	SizedSPropTagArray( 2, tags ) = { 2, { PR_SERVICE_NAME, PR_SERVICE_UID} } ;

	//lets get the service name and the service uid for the primary service
	pServiceTable->SetColumns( (LPSPropTagArray)&tags, 0 ) ;
    LPSRowSet pRows = NULL;
	hRes = pServiceTable->QueryRows( dwCount, 0, &pRows);
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"IMAPITable::QueryRows failed on Message service table. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes;
	}

	ULONG ulIndexOfDelegationService = 0 ;
	for(ULONG i = 0; i < pRows->cRows ; i++) {
		if(PR_SERVICE_NAME == pRows->aRow[i].lpProps[0].ulPropTag) { 
			if(0 == lstrcmpiW(pRows->aRow[i].lpProps[0].Value.LPSZ, L"LSMS_Secondary"))
			{
				ulIndexOfDelegationService = i ;
			}
		}
	}

	CComPtr<IMAPITable> pMsgStoresTable ;
	hRes = pSession->GetMsgStoresTable(0, &pMsgStoresTable) ;
	LPSRowSet pStoreTableRows = NULL;	
	hRes = pMsgStoresTable->QueryRows(1, 0, &pStoreTableRows);
	SBinary storeEID = {0};
	storeEID.cb  = pStoreTableRows->aRow[0].lpProps[0].Value.bin.cb;
	storeEID.lpb = pStoreTableRows->aRow[0].lpProps[0].Value.bin.lpb;
	CComPtr<IMsgStore> pStore;
	hRes = pSession->OpenMsgStore( NULL, storeEID.cb, (LPENTRYID)storeEID.lpb, NULL, 0, &pStore );

	ULONG cbGALContainerEntryId = 0;
	LPBYTE pbGALContainerEntryId = NULL;
	GetHexFromString( szGalEntryID, cbGALContainerEntryId, pbGALContainerEntryId );
	AutoArray<BYTE> pbSafeGALContainerEntryId(pbGALContainerEntryId);

	CComPtr<IMAPIFolder> pGAL;
	ULONG ulObjType = 0;
	hRes = pSession->OpenEntry(cbGALContainerEntryId, (LPENTRYID)pbGALContainerEntryId, NULL, MAPI_BEST_ACCESS, &ulObjType, (LPUNKNOWN*) &pGAL);
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"Failed to get the GAL container. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes;
	}

	CComPtr<IMAPITable> pGalContentsTable ;
	hRes = pGAL->GetContentsTable(MAPI_UNICODE, &pGalContentsTable) ;
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"Failed to get the GAL contents table, cannot find user. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes;
	}

	SizedSPropTagArray( 2, sptProps ) = { 2, { PR_ENTRY_ID, PR_DISPLAY_NAME } };
	
	hRes = pGalContentsTable->SetColumns( (LPSPropTagArray)&sptProps, NULL );
	if(FAILED(hRes))
	{
		wsprintf( pwszMsg, L"Failed to set nesessary columns for the search in the Gal contents table. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes;
	}

	// Do the restriction.  Let's try it on PR_SMTP_ADDRESS, since that's not a named prop
	SPropValue spvPropSR = {0};
	spvPropSR.ulPropTag = PR_SMTP_ADDRESS_W;
	spvPropSR.Value.LPSZ = (LPTSTR)szOtherUsersEmail;
	SRestriction SR = {0};
	SR.rt = RES_PROPERTY;
	SR.res.resProperty.relop = RELOP_EQ;
	SR.res.resProperty.ulPropTag = spvPropSR.ulPropTag;
	SR.res.resProperty.lpProp = &spvPropSR;

	LPSRowSet pGALRows = NULL;
	SBinary delegateEID = {0};
	hRes = pGalContentsTable->FindRow(&SR, BOOKMARK_BEGINNING, 0);
	if (SUCCEEDED(hRes)) {	// found it
		hRes = pGalContentsTable->QueryRows(1, 0, &pGALRows);
		delegateEID.cb  = pGALRows->aRow[0].lpProps[0].Value.bin.cb;
		delegateEID.lpb = pGALRows->aRow[0].lpProps[0].Value.bin.lpb;
		lstrcpy(pwszDisplayName, pGALRows->aRow[0].lpProps[1].Value.lpszW);
	}
	else
	{
		wsprintf( pwszMsg, L"Failed to find GAL entry. Error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		return hRes;
	}

	ULONG cbOtherUserEntryId = 0;
	LPBYTE pbOtherUserEntryId = NULL;
	GetHexFromString( szOtherUsersGUID, cbOtherUserEntryId, pbOtherUserEntryId );
	AutoArray<BYTE> pbSafeOtherUserEntryId(pbOtherUserEntryId);

	SPropValue rgval[5];

	ZeroMemory(&rgval[0], sizeof(SPropValue) );
	rgval[0].ulPropTag = PR_ZIMBRA_DELEGATE_USER_DISPLAY_NAME_W;
	rgval[0].Value.LPSZ = pwszDisplayName;

	ZeroMemory(&rgval[1], sizeof(SPropValue) );
	rgval[1].ulPropTag = PR_ZIMBRA_DELEGATE_USER_FULL_EMAIL_ADDRESS_W;
	rgval[1].Value.LPSZ = (LPTSTR)szOtherUsersEmail;

	ZeroMemory(&rgval[2], sizeof(SPropValue) );
	rgval[2].ulPropTag = PR_ZIMBRA_DELEGATE_USER_ADDRESS_TYPE_W;
	rgval[2].Value.LPSZ = L"SMTP";

	ZeroMemory(&rgval[3], sizeof(SPropValue) );
	rgval[3].ulPropTag = PR_ZIMBRA_DELEGATE_USER_ENTRY_ID;
	rgval[3].Value.bin.cb = delegateEID.cb;
	rgval[3].Value.bin.lpb = delegateEID.lpb;

 	GUID guidDelegateZimbraId = {0} ;
	UuidFromStringA((RPC_CSTR)szOtherUsersGUID, &guidDelegateZimbraId) ;

	ZeroMemory(&rgval[4], sizeof(SPropValue) );
	rgval[4].ulPropTag = PR_ZIMBRA_DELEGATE_USER_ID;
	rgval[4].Value.bin.cb = sizeof(guidDelegateZimbraId);
	rgval[4].Value.bin.lpb = (LPBYTE)&guidDelegateZimbraId;

	hRes = pMsgServiceAdmin->ConfigureMsgService(reinterpret_cast<LPMAPIUID>(pRows->aRow[ulIndexOfDelegationService].lpProps[1].Value.bin.lpb),
												 NULL, 0, 5, rgval) ;
	if (FAILED(hRes))
	{
		//if we could not configure our delegate msgstore we will remove it from profile
		wsprintf( pwszMsg, L"IMsgServiceAdmin::ConfigureMsgService failed with error 0x%x", hRes );
		OutputDebugString( pwszMsg );
		pMsgServiceAdmin->DeleteMsgService(reinterpret_cast<LPMAPIUID>(pRows->aRow[ulIndexOfDelegationService].lpProps[1].Value.bin.lpb));			
	}

	return hRes;
}

