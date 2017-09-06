#pragma once

//macro to return if failed
#define RIF(x)	if( FAILED(x) ){ return x; }


template<class T>
class AutoArray
{
public:
	AutoArray(T* t) : _p(t){}
	~AutoArray(){
		if( _p ) { delete[] _p; _p=NULL; }
	}
private:
	T* _p;
};


template<class T>
class AutoMapiFree
{
public:
	AutoMapiFree(T* t) : _p(t){}
	~AutoMapiFree(){ 
		if(_p){ MAPIFreeBuffer(_p); _p=NULL; }
	}
private:
	T* _p;
};

//contains required state for most functions to work
class ModuleContext
{
public:
	ModuleContext() {}
	~ModuleContext(){ Uninitialize(); }

	HRESULT Initialize( LPTSTR pszProfileName );
	LPMAPISESSION GetSession();
	bool IsInitialized(){ return m_bInitialized; }
	LPCTSTR GetProfileName() { return m_pszProfileName; }
private:
	
	HRESULT Uninitialize();
	bool m_bInitialized;
	CComPtr<IMAPISession> m_spSession;
	LPTSTR m_pszProfileName;
};


typedef struct _MAPIInit
{
	HRESULT hr;
	WCHAR pwszMsg[256];
	_MAPIInit(){
		hr = E_FAIL;
		MAPIINIT_0 init;
		init.ulFlags =  MAPI_NO_COINIT |  MAPI_MULTITHREAD_NOTIFICATIONS;
		init.ulVersion = MAPI_INIT_VERSION;
		hr = MAPIInitialize(&init);
		wsprintf( pwszMsg, L"MAPIInitialize returned 0x%x", hr );
		OutputDebugString( pwszMsg );
	}
	~_MAPIInit(){
		// GJ. Don't call MAPIUninitialize because its difficult to manage the lifecycle for this DLL.
		// The marshalled calls seem to execute on different threads etc.
		// The DLL is hosted in an exe and once MAPI has been initialized we don't want to shut it down
		// until the exe exits. Otherwise the MAPI buffers in UserSession can become invalid.
		// Multiple calls to MAPIInitialize() for each thread will just cause the reference count to keep
		// incrementing.
		//MAPIUninitialize();
	}
}MAPIInit;


static const GUID ZIMBRA_NAMEDPROP_GUID = 
{ 0x20022104, 0x6842, 0x430D, { 0xb1, 0x9c, 0x87, 0x39, 0xbf, 0xdb, 0x91, 0x88 } };






class IZimbraMsgStore : public IMsgStore
{
	public:
		virtual ~IZimbraMsgStore(){}
		virtual IMsgStore*	__stdcall InnerStore() = 0;
		virtual const SBinary& __stdcall GetUserRootEid() = 0;
		virtual const SBinary& __stdcall GetOutboxEid() = 0;
		virtual HRESULT __stdcall Initialize() = 0;
		virtual HRESULT __stdcall Uninitialize() = 0;
		virtual HRESULT __stdcall GetEntryId( ULONG zid, ULONG* pcb, LPBYTE* ppb ) = 0;
};


BOOL GetHexFromString( LPSTR pszEntryId, ULONG& cbEntryId, LPBYTE& pbEntryId );
