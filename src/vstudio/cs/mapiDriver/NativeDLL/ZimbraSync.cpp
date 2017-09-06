#include "stdafx.h"
#include "util.h"

extern "C" {
HRESULT InitiateSync( LPTSTR pszProfileName, LPSTR pszStoreEid );
}


/**
 *  Tells ZCO to sync the stores in the profile by
 *  calling GetOutgoingQueues on the store object
 **/
HRESULT InitiateSync( LPTSTR pszProfileName, LPSTR pszStoreEid )
{
	ModuleContext context;
	context.Initialize(pszProfileName);

	HRESULT hr;

	//module must be initialized for a session to exist
	CComPtr<IMAPISession> pSession = context.GetSession();

	ULONG cbEid = 0;
	LPBYTE lpbEntryId = NULL;
	GetHexFromString( pszStoreEid, cbEid, lpbEntryId );
	AutoArray<BYTE> ensureCleanup(lpbEntryId);

	CComPtr<IMsgStore> pStore;
	hr = pSession->OpenMsgStore( 0, cbEid, (LPENTRYID)lpbEntryId, NULL, MAPI_BEST_ACCESS, &pStore );

	WCHAR pwszMsg[256];
	wsprintf( pwszMsg, L"OpenMsgStore result %x", hr );
	OutputDebugString( pwszMsg );

	RIF(hr);	

	CComPtr<IMAPITable> pTable;
	hr = pStore->GetOutgoingQueue( 0, &pTable );

	return S_OK;
}

