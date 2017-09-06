package com.zimbra.qa.extentions.httpstore;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import org.apache.commons.httpclient.methods.PostMethod;
import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.Element;
import org.dom4j.io.SAXReader;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.extension.ExtensionException;
import com.zimbra.cs.extension.ZimbraExtension;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.store.external.ExternalBlobIO;
import com.zimbra.cs.store.http.HttpStoreManager;

;

/**
 * ScalityHttpStoreManager Implementation
 * @author Prashant Surana
 */
public class ScalityHttpStoreManager extends HttpStoreManager implements
		ExternalBlobIO,ZimbraExtension {

	String baseUrl = "http://zqa-432.eng.vmware.com:8081/srestd.fcgi";
	long startTime;
	private Map<String, String> mConfiguredKeys = new HashMap<String, String>();

	void setConf(String paramString1, String paramString2) {
		this.mConfiguredKeys.put(paramString1, paramString2);
	}

	String getConf(String paramString) {
		if (this.mConfiguredKeys.containsKey(paramString)) {
			return this.mConfiguredKeys.get(paramString);
		}
		return null;
	}

	@SuppressWarnings("unchecked")
	@Override
	public void startup() throws IOException, ServiceException {
		ZimbraLog.store.debug("ScalityHttpStoreManager: startup");
		this.startTime = System.currentTimeMillis();

		String str1 = System.getProperty("scality_http_store_manager.config");
		if (str1==null) {
			str1 = File.separator + "opt" + File.separator + "zimbra"
					+ File.separator + "conf" + File.separator
					+ "scality_http_store_manager_config.xml";
		}
		ZimbraLog.store.debug("Reading http store configuration from: " + str1);
		File confFile = new File(str1);
		try {
			SAXReader localSAXReader = new SAXReader();
			Document localDocument = localSAXReader.read(confFile);

			Element localElement1 = localDocument.getRootElement();
			if (!localElement1.getName().equals(
					"scality_http_store_manager_config")) {
				throw new DocumentException("config file " + str1
						+ " root tag is not "
						+ "scality_http_store_manager_config");
			}

			for (Iterator localObject2 = localElement1.elementIterator("key"); localObject2.hasNext();) {
				Element localElement2 = (Element)localObject2.next();
				String str2 = localElement2.attributeValue("name");
				String str3 = localElement2.elementText("value");
				ZimbraLog.store.info("Read Property: " + str2 + " value="
						+ str3);
				setConf(str2, str3);
			}

			String url = getConf("base_url");
			if (url != null)
				this.baseUrl = url;
		} catch (DocumentException localDocumentException) {
			ZimbraLog.store.warn("ScalityHttpStoreManager: " + str1 + " not present");
			throw ServiceException.FAILURE("Error occured",localDocumentException);

		}

		ZimbraLog.store.debug("ScalityHttpStoreManager: baseUrl=" + this.baseUrl);
		super.startup();
	}

	protected String getPostUrl(Mailbox paramMailbox) {
	    ZimbraLog.store.info("ScalityHttpStoreManager: getPostUrl: accountId " + paramMailbox.getAccountId());
	    String res=this.baseUrl + "?type=zimbra&" + "accountId=" + paramMailbox.getAccountId() + "&startTime=" + this.startTime + "&lastChangeID=" + paramMailbox.getLastChangeID() + "&lastChangeDate=" + paramMailbox.getLastChangeDate() + "&requestTime=" + System.currentTimeMillis();
	    ZimbraLog.store.debug("Scality Http store PostURL: "+res);
	    return res;
	  }

	  protected String getGetUrl(Mailbox paramMailbox, String paramString) {
	    ZimbraLog.store.info("ScalityHttpStoreManager: getGetUrl: locator " + paramString);
	    String res=this.baseUrl + "?" + paramString;
	    ZimbraLog.store.debug("Scality Http store GetURL: "+res);
	    return res;
	  }

	  protected String getDeleteUrl(Mailbox paramMailbox, String paramString) {
	    ZimbraLog.store.info("ScalityHttpStoreManager: getDeleteUrl: locator " + paramString);
	    String res=this.baseUrl + "?" + paramString;
	    ZimbraLog.store.debug("Scality Http store Delete URL: "+res);
	    return res;
	  }

		@Override
		public void destroy() {
			super.shutdown();
		}

		@Override
		public String getName() {
			return "httpstore";
		}

		@Override
		public void init() throws ExtensionException, ServiceException {
		}

		@Override
		protected String getLocator(PostMethod post, String postDigest,
				long postSize, Mailbox mbox) throws ServiceException,
				IOException {
		    String str = post.getResponseHeader("x-scality-id").getValue();
		    ZimbraLog.store.info("Scality Http store locator id" + str);
		    return str;
		}

}
