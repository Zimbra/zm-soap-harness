#include "stdafx.h"
#include "util.h"


extern "C" {
	HRESULT IsSyncInProgress(LPTSTR pszProfileName, LPSTR pszStoreEntryId, PUINT32 pInProgress);
	HRESULT GetZimbraId( LPTSTR pszProfileName, LPSTR pszItemEntryId, PUINT32 pZimbraId ); 
	HRESULT GetEntryId( LPTSTR pszProfileName, LPSTR pszStoreEntryId, ULONG zimbraId, LPTSTR pszEntryIdBuf, UINT nBufChars );
}


HRESULT GetOneNamedProp( ModuleContext& context, LPSTR pszItemEntryId, LPMAPINAMEID pNameId, LPSPropValue* ppProp, ULONG propType );

/**
 *  Returns the currently logged on mapi session
 *  calls must Release the com_ptr as this function
 *  calls AddRef
 **/
LPMAPISESSION ModuleContext::GetSession()
{
	if( !m_bInitialized ) {
		throw "Module not initialized";
	}

	LPMAPISESSION p = m_spSession.Detach();
	p->AddRef();
	return p;
}


/**
 *
 *
 *
 **/
HRESULT ModuleContext::Initialize(LPTSTR pszProfileName)
{
	if( m_bInitialized == true ) {
		throw "Alread initialized";
	}

	MAPIInit g_mapiInit;

	DWORD dwUnicode = 0;
#if UNICODE
	dwUnicode++;
#endif

	DWORD dwFlags = MAPI_EXTENDED | dwUnicode;
	HRESULT hr = MAPILogonEx( 0, pszProfileName, NULL, dwFlags, &(m_spSession) );
	RIF(hr);

	size_t len = _tcslen(pszProfileName)+1;
	m_pszProfileName = new TCHAR[len];
	_tcscpy_s(m_pszProfileName, len, pszProfileName);

	m_bInitialized = true;
	return hr;
}



/**
 *
 *
 *
 **/
HRESULT ModuleContext::Uninitialize()
{
	if( !m_bInitialized ) {
		return S_OK;
	}

	if( m_spSession ) {
		m_spSession->Logoff( NULL, 0, 0 );
		m_spSession.Release();
		m_spSession = NULL;
	}

	if( m_pszProfileName != NULL ) {
		delete [] m_pszProfileName;
		m_pszProfileName = NULL;
	}

	m_bInitialized = false;
	return S_OK;
}



BOOL GetHexFromString( LPSTR pszEntryId, ULONG& cbEntryId, LPBYTE& pbEntryId )
{
	cbEntryId = (ULONG)((strlen(pszEntryId)+1)/2);
	pbEntryId = new BYTE[ cbEntryId  ];
	return FBinFromHex( (LPTSTR)pszEntryId, pbEntryId );
}


/**
 *
 *
 *
 **/
HRESULT IsSyncInProgress( LPTSTR lpszProfileName, LPSTR pszStoreEntryId, PUINT32 pInProgress )
{
	ModuleContext context;
	HRESULT hr = context.Initialize(lpszProfileName);
	RIF(hr);

	if( pszStoreEntryId == NULL ) { 
		return E_FAIL; 
	}

	pInProgress = 0;

	MAPINAMEID nameId;
	nameId.Kind.lID = 0x8002;
	nameId.lpguid = (LPGUID)&(ZIMBRA_NAMEDPROP_GUID);
	nameId.ulKind = MNID_ID;

	LPSPropValue pProp;
	hr = GetOneNamedProp( context, pszStoreEntryId, &nameId, &pProp, PT_LONG );
	AutoMapiFree<SPropValue> spProp(pProp);
	RIF(hr);

	if( pProp ) {
		*pInProgress = pProp->Value.l;
	}

	return S_OK;
}



/**
 *
 *
 *
 **/
HRESULT GetZimbraId( LPTSTR lpszProfileName, LPSTR pszItemEntryId, PUINT32 pZimbraId ) 
{
	ModuleContext context;
	HRESULT hr = context.Initialize(lpszProfileName);
	RIF(hr);

	if( pszItemEntryId == NULL || pZimbraId == NULL ) { 
		return E_FAIL; 
	}
	
	*pZimbraId = 0;

	MAPINAMEID nameId;
	nameId.Kind.lID = 0x8100;
	nameId.lpguid = (LPGUID)&(ZIMBRA_NAMEDPROP_GUID);
	nameId.ulKind = MNID_ID;

	LPSPropValue pProp;
	hr = GetOneNamedProp( context, pszItemEntryId, &nameId, &pProp, PT_LONG );
	AutoMapiFree<SPropValue> spProp(pProp);

	RIF(hr);
	
	*pZimbraId = pProp->Value.l;
	return S_OK;
}



/**
 *  Get the entry-id of the item with the given zimbra-id in the given store
 *
 *
 **/
HRESULT GetEntryId( LPTSTR pszProfileName, LPSTR pszStoreEntryId, ULONG zimbraId, LPTSTR pszEntryIdBuf, UINT nBufChars )
{
	ModuleContext context;
	HRESULT hr = context.Initialize(pszProfileName);
	RIF(hr);

	if( pszStoreEntryId == NULL || pszStoreEntryId == NULL || pszEntryIdBuf == 0 ) { 
		return E_FAIL; 
	}

	ULONG cbStoreEntryId = 0;
	LPBYTE pbStoreEntryId = NULL;
	GetHexFromString( pszStoreEntryId, cbStoreEntryId, pbStoreEntryId );
	AutoArray<BYTE> pbSafeStoreEntryId(pbStoreEntryId);

	CComPtr<IMAPISession> pSession = context.GetSession();
	CComPtr<IMsgStore> pStore;
	hr = pSession->OpenMsgStore( 0, cbStoreEntryId, (LPENTRYID)pbStoreEntryId, NULL, MAPI_BEST_ACCESS, &pStore );
	RIF(hr);
	
	ULONG cbEntryId = 0;
	LPBYTE pbEntryId = NULL;
	IZimbraMsgStore* pZimbraStore = (IZimbraMsgStore*)(IMsgStore*)pStore;
	hr = pZimbraStore->GetEntryId( zimbraId, &cbEntryId, &pbEntryId );
	AutoMapiFree<BYTE> pSafeEntryId(pbEntryId);
	RIF(hr);

	if(nBufChars >= ((cbEntryId*2)+1) ) {
		HexFromBin(pbEntryId, cbEntryId, pszEntryIdBuf);
		return S_OK;
	}	

	return E_FAIL;
}



/**
 *
 *
 *
 **/
HRESULT GetOneNamedProp( ModuleContext& context, LPSTR pszItemEntryId, LPMAPINAMEID pNameId, LPSPropValue* ppProp, ULONG propType )
{
	//convert string to entryid
	ULONG cbEid = 0;
	LPBYTE lpbEntryId = NULL;
	GetHexFromString( pszItemEntryId, cbEid, lpbEntryId );
	AutoArray<BYTE> ensureCleanup(lpbEntryId);

	CComPtr<IMAPISession> pSession = context.GetSession();
	CComPtr<IMAPIProp> pObj;
	ULONG ulObjType;
	HRESULT hr = pSession->OpenEntry( cbEid, (LPENTRYID)lpbEntryId, NULL, MAPI_BEST_ACCESS, &ulObjType, (LPUNKNOWN*) &pObj );
	RIF(hr);

	MAPINAMEID * names[1] = {pNameId};

	DWORD ulZimbraIdTag = 0;
	LPSPropTagArray lpTags = NULL;
	hr = pObj->GetIDsFromNames(1, names, MAPI_CREATE, &lpTags );
	AutoMapiFree<SPropTagArray> spTags(lpTags);

	if( SUCCEEDED(hr) && 1 == lpTags->cValues && PT_ERROR != PROP_TYPE(lpTags->aulPropTag[0])) {
		ulZimbraIdTag = lpTags->aulPropTag[0] | propType;
	} else {
		return E_FAIL;
	}

	return HrGetOneProp( pObj, ulZimbraIdTag, ppProp );
}