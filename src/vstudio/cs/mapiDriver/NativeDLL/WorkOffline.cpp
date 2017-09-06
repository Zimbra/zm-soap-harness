#include "stdafx.h"
#include "Util.h"


using namespace std;

/// define the exported function as extern 'c' so the name isn't c++ decorated
extern "C" {
HRESULT SetConnectionStatus( LPTSTR pszProfileName, int status );
}


/**
 *  Sets outlook to online or offline (connection status)
 *
 *  @pwszProfileName - the name of the currently logged on profile
 *  @status - 1 for offline, 2 for online per IMAPIOffline::SetCurrentState
 *
 **/
HRESULT SetConnectionStatus( LPTSTR pszProfileName, int status )
{
	//must be a valid value
	if( status != MAPIOFFLINE_STATE_OFFLINE || status != MAPIOFFLINE_STATE_OFFLINE ) {
		return E_FAIL;
	}

	// Load the MSMAPI DLL
	HMODULE hModMsmapi32 = GetModuleHandle(L"msmapi32.dll") ;
	if(!hModMsmapi32) {
		return E_FAIL ;
	}

	// Get the HrOpenOfflineObj object
	HROPENOFFLINEOBJ  pfnHrOpenOfflineObj = (HROPENOFFLINEOBJ )GetProcAddress(hModMsmapi32, "HrOpenOfflineObj@20") ;
	if(NULL == pfnHrOpenOfflineObj) {
		return E_FAIL ;
	}

	// Get the IMAPIOfflineMgr object
	CComPtr<IMAPIOfflineMgr> spOfflineMgr ;
	HRESULT hr = (*pfnHrOpenOfflineObj)(0, pszProfileName, &GUID_GlobalState, NULL, &spOfflineMgr) ;
	if(FAILED(hr)) {
		return hr ;
	}

	//QueryInterface for IMAPIOffline from IMAPIOfflineMgr
	CComQIPtr<IMAPIOffline> spOffline;
	spOffline = spOfflineMgr;

	hr = spOffline->SetCurrentState(
		MAPIOFFLINE_FLAG_BLOCK, // block the SetCurrentState call until the state change is complete
		MAPIOFFLINE_STATE_OFFLINE_MASK, // The part of the state to change
		status, // The state to change to
		NULL);
	if(FAILED(hr)) {
		return hr ;
	}

	return (S_OK);
}


