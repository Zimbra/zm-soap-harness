#include "stdafx.h"
#include "Atlbase.h"

#include <iostream>
#include <tchar.h>
#include <initguid.h>
#include "mapix.h"
#include "mapiutil.h"
#include "MapiOffline.h"



int InitialSync( IMsgStore* pStore ) {

	HRESULT hr;
	LPMAPITABLE FAR * lppTable ;

	hr = pStore->GetOutgoingQueue(
		0,			// Reserved; must be zero.
		lppTable	// Pointer to a pointer to the outgoing queue table.
		);

	if(FAILED(hr))
	{
		//TRACE(_T("%hs. HrOpenOfflineObj failed with error 0x%x"),
		//		__FUNCTION__, hr) ;
		return hr ;
	}

	return (hr);
}

void DeltaSync(void) {
	return;
}
