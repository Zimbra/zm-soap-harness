/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite, Network Edition.
 * Copyright (C) 2006 Zimbra, Inc.  All Rights Reserved.
 * 
 * ***** END LICENSE BLOCK *****
 */
#pragma once

#define MAPIOFFLINE_ADVISE_DEFAULT (ULONG)0 
#define MAPIOFFLINE_UNADVISE_DEFAULT (ULONG)0 
#define MAPIOFFLINE_ADVISE_TYPE_STATECHANGE  1 
#define MAPIOFFLINE_CAPABILITY_OFFLINE  0x1 
#define MAPIOFFLINE_CAPABILITY_ONLINE  0x2 
#define MAPIOFFLINE_FLAG_BLOCK 0x00002000 
#define MAPIOFFLINE_FLAG_DEFAULT 0x00000000 
#define MAPIOFFLINE_STATE_ALL 0x003f037f  
#define MAPIOFFLINE_STATE_OFFLINE_MASK  0x00000003  
#define MAPIOFFLINE_STATE_OFFLINE	0x00000001
#define MAPIOFFLINE_STATE_ONLINE	0x00000002 

typedef enum 
{ 
     MAPIOFFLINE_CALLBACK_TYPE_NOTIFY = 0
} MAPIOFFLINE_CALLBACK_TYPE ;

typedef enum 
{
	MAPIOFFLINE_NOTIFY_TYPE_STATECHANGE_START = 1, 
	MAPIOFFLINE_NOTIFY_TYPE_STATECHANGE = 2, 
	MAPIOFFLINE_NOTIFY_TYPE_STATECHANGE_DONE = 3 
} MAPIOFFLINE_NOTIFY_TYPE ;


typedef struct 
{
	ULONG ulSize;
	MAPIOFFLINE_NOTIFY_TYPE NotifyType;
	ULONG ulClientToken;
	union 
	{
		struct
        {
        	ULONG ulMask;
        	ULONG ulStateOld;
        	ULONG ulStateNew;
        } StateChange;
    } Info;
} MAPIOFFLINE_NOTIFY ;


typedef struct
{
	ULONG				ulSize;
	ULONG				ulClientToken;
	MAPIOFFLINE_CALLBACK_TYPE	CallbackType;
	IUnknown*			pCallback;
	ULONG				ulAdviseTypes;
	ULONG				ulStateMask;
} MAPIOFFLINE_ADVISEINFO ;

//{fbeffd93-b11f-4094-842b-96dcd31e63d1}

DEFINE_GUID(GUID_GlobalState , 0xfbeffd93, 0xb11f, 0x4094, 0x84, 0x2b, 0x96, 0xdc, 0xd3, 0x1e, 0x63, 0xd1); 

//{000672B5-0000-0000-c000-000000000046}
DEFINE_GUID(IID_IMAPIOffline, 0x000672B5, 0x0000, 0x0000, 0xc0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x0, 0x46);

//{0317bde5-fc29-44cd-8dcd-36125a3be9ec}

DEFINE_GUID(IID_IMAPIOfflineNotify, 0x0317bde5, 0xfc29, 0x44cd, 0x8d, 0xcd, 0x36, 0x12, 0x5a, 0x3b, 0xe9, 0xec);

//{42175607-ff3e-4790-bc18-66c8643e6424 }

DEFINE_GUID(IID_IMAPIOfflineMgr, 0x42175607, 0xFF3E, 0x4790, 0xbc, 0x18, 0x66, 0xc8, 0x64, 0x3e, 0x64, 0x24);

interface __declspec(uuid("{000672B5-0000-0000-c000-000000000046}")) IMAPIOffline : public IUnknown 
{
	STDMETHOD(SetCurrentState)(ULONG ulFlags, ULONG ulMask, ULONG ulState, void* pReserved) PURE ;
	STDMETHOD(GetCapabilities)(ULONG *pulCapabilities) PURE ;
	STDMETHOD(GetCurrentState)(ULONG* pulState) PURE ;
	STDMETHOD(PlaceHolder()) PURE ;
} ;

interface __declspec(uuid("{42175607-ff3e-4790-bc18-66c8643e6424}")) IMAPIOfflineMgr : public IMAPIOffline
{
	STDMETHOD(Advise)(ULONG ulFlags, MAPIOFFLINE_ADVISEINFO* pAdviseInfo,
					ULONG* pulAdviseToken) PURE ;
	STDMETHOD(Unadvise)(ULONG ulFlags, ULONG ulAdviseToken) PURE ;
	STDMETHOD(PlaceHolder1)() PURE ;
	STDMETHOD(PlaceHolder2)() PURE ;
	STDMETHOD(PlaceHolder3)() PURE ;
	STDMETHOD(PlaceHolder4)() PURE ;
	STDMETHOD(PlaceHolder5)() PURE ;
	STDMETHOD(PlaceHolder6)() PURE ;
	STDMETHOD(PlaceHolder7)() PURE ;
} ;

interface __declspec(uuid("{0317bde5-fc29-44cd-8dcd-36125a3be9ec}")) IMAPIOfflineNotify : public IUnknown
{
	STDMETHOD_(VOID,Notify)(const MAPIOFFLINE_NOTIFY *pNotifyInfo) PURE ;
} ;

typedef HRESULT (STDMETHODCALLTYPE* HROPENOFFLINEOBJ)
(
	ULONG ulReserved,
	LPCWSTR pwszProfileNameIn,
	const GUID* pGUID,
	const GUID* pReserved,
	IMAPIOfflineMgr** ppOfflineObj
) ;
