package com.zimbra.qa.soap;

import java.io.*;
import java.net.*;
import java.util.*;


/*
 * Source code is based on  http://java.sun.com/developer/JDCTechTips/2005/tt0913.html
 */


public class ZCookieHandler extends CookieHandler {

  // "Long" term storage for cookies, not serialized so only
  // for current JVM instance
  private List<ZCookie> cache = new LinkedList<ZCookie>();
  
  public List<ZCookie> getCookieStore(){return cache;}
  

  /**
   * Saves all applicable cookies present in the response 
   * headers into cache.
   * @param uri URI source of cookies
   * @param responseHeaders Immutable map from field names to 
   * lists of field
   *   values representing the response header fields returned
   */

  public void put(
      URI uri,
      Map<String, List<String>> responseHeaders)
        throws IOException {

    //System.out.println("Cache: " + cache);
    List<String> setCookieList = 
      responseHeaders.get("Set-Cookie");
    if (setCookieList != null) {
      for (String item : setCookieList) {
        ZCookie cookie = new ZCookie(uri, item);
        // Remove cookie if it already exists
        // New one will replace
        put(cookie);
     }
   }
 }

  
public void put(ZCookie cookie)
{
    for (ZCookie existingCookie : cache) {
        if((cookie.getURI().equals(
          existingCookie.getURI())||(cookie.domain).equals(existingCookie.domain)) &&
           (cookie.getName().equals(
             existingCookie.getName()))) {
         cache.remove(existingCookie);
         break;
       }
     }
     //System.out.println("Adding to cache: " + cookie);
     cache.add(cookie);
	
}
  
  
 /**
  * Gets all the applicable cookies from a cookie cache for 
  * the specified uri in the request header.
  *
  * @param uri URI to send cookies to in a request
  * @param requestHeaders Map from request header field names 
  * to lists of field values representing the current request 
  * headers
  * @return Immutable map, with field name "Cookie" to a list 
  * of cookies
  */

 public Map<String, List<String>> get(
     URI uri,
     Map<String, List<String>> requestHeaders)
       throws IOException {

   // Retrieve all the cookies for matching URI
   // Put in comma-separated list
   StringBuilder cookies = new StringBuilder();
   for (ZCookie cookie : cache) {
     // Remove cookies that have expired
     if (cookie.hasExpired()) {
       cache.remove(cookie);
     } else if (cookie.matches(uri)) {
       if (cookies.length() > 0) {
         cookies.append("; ");
       }
       cookies.append(cookie.toString());
     }
   }

   // Map to return
   Map<String, List<String>> cookieMap =
     new HashMap<String, List<String>>(requestHeaders);

   // Convert StringBuilder to List, store in map
   if (cookies.length() > 0) {
     List<String> list =
       Collections.singletonList(cookies.toString());
     cookieMap.put("Cookie", list);
   }
 return Collections.unmodifiableMap(cookieMap);
 }
}