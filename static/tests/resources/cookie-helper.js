// Set up exciting global variables for cookie tests.
(_ => {
  var HOST = "rfc6265.biz";
  var PORT = "";
  var CROSS_ORIGIN_HOST = "rfc6265biz.appspot.com";
  if (window.location.hostname.match(/rfc6265.test$/)) {
    PORT = ":8080"
    HOST = "rfc6265.test";
    CROSS_ORIGIN_HOST = "127.0.0.1";
  }

  //For secure cookie verification
  window.SECURE_ORIGIN = "https://" + HOST + PORT;
  window.INSECURE_ORIGIN = "http://" + HOST + PORT;
  
  //standard references
  window.ORIGIN = "http://" + HOST + PORT;
  window.WWW_ORIGIN = "http://www." + HOST + PORT;
  window.SUBDOMAIN_ORIGIN = "http://subdomain." + HOST + PORT;
  window.CROSS_SITE_ORIGIN = "http://" + CROSS_ORIGIN_HOST + PORT;

  // Set the global cookie name.
  window.HTTP_COOKIE = "cookie_via_http";

  // If we're not on |HOST|, move ourselves there:
  if (window.location.hostname != HOST)
    window.location.hostname = HOST;
})();

// A tiny helper which returns the result of fetching |url| with credentials.
function credFetch(url) {
  return fetch(url, {"credentials": "include"});
}

// Returns a URL on |origin| which redirects to a given absolute URL.
function redirectTo(origin, url) {
  return origin + "/redir?to=" + encodeURIComponent(url);
}

// Asserts that `document.cookie` contains or does not contain (according to
// the value of |present|) a cookie named |name| with a value of |value|.
function assert_dom_cookie(name, value, present) {
  var re = new RegExp("(?:^|; )" + name + "=" + value + "(?:$|;)");
  assert_equals(re.test(document.cookie), present, "`" + name + "=" + value + "` in `document.cookie`");
}

function assert_cookie(origin, obj, name, value, present) {
  assert_equals(obj[name], present ? value : undefined, "`" + name + "=" + value + "` in request to `" + origin + "`.");
}

// Remove the cookie named |name| from |origin|, then set it on |origin| anew.
// If |origin| matches `document.origin`, also assert (via `document.cookie`) that
// the cookie was correctly removed and reset.
function create_cookie(origin, name, value, extras) {
  alert("Create_cookie: " + origin + "/cookie/drop?name=" + name);	
  return credFetch(origin + "/cookie/drop?name=" + name)
    .then(_ => {
      if (origin == document.origin)
        assert_dom_cookie(name, value, false);
    })
    .then(_ => {
      return credFetch(origin + "/cookie/set?" + name + "=" + value + ";path=/;" + extras)
        .then(_ => {
          if (origin == document.origin)
            assert_dom_cookie(name, value, true);
        });
    });
}

//
// SameSite-specific test helpers:
//

window.SameSiteStatus = {
  CROSS_SITE: "cross-site",
  LAX: "lax",
  STRICT: "strict"
};

// Reset SameSite test cookies on |origin|. If |origin| matches `document.origin`, assert
// (via `document.cookie`) that they were properly removed and reset.
function resetSameSiteCookies(origin, value) {
  return credFetch(origin + "/cookie/drop/samesite")
    .then(_ => {
      if (origin == document.origin) {
        assert_dom_cookie("samesite_strict", value, false);
        assert_dom_cookie("samesite_lax", value, false);
        assert_dom_cookie("samesite_invalid", value, false);
        assert_dom_cookie("samesite_none", value, false);
      }
    })
    .then(_ => {
      return credFetch(origin + "/cookie/set/samesite?" + value)
        .then(_ => {
          if (origin == document.origin) {
            assert_dom_cookie("samesite_strict", value, true);
            assert_dom_cookie("samesite_lax", value, true);
            assert_dom_cookie("samesite_none", value, true);

            // The invalid SameSite attribute causes this cookie to be ignored.
            assert_dom_cookie("samesite_invalid", value, false);
          }
        })
    })
}

// Given an |expectedStatus| and |expectedValue|, assert the |cookies| contains the
// proper set of cookie names and values.
function verifySameSiteCookieState(expectedStatus, expectedValue, cookies) {
    assert_equals(cookies["samesite_none"], expectedValue, "Non-SameSite cookies are always sent.");
    assert_equals(cookies["samesite_invalid"], undefined, "Cookies with invalid SameSite attributes are ignored.");
    if (expectedStatus == SameSiteStatus.CROSS_SITE) {
      assert_equals(cookies["samesite_strict"], undefined, "SameSite=Strict cookies are not sent with cross-site requests.");
      assert_equals(cookies["samesite_lax"], undefined, "SameSite=Lax cookies are not sent with cross-site requests.");
    } else if (expectedStatus == SameSiteStatus.LAX) {
      assert_equals(cookies["samesite_strict"], undefined, "SameSite=Strict cookies are not sent with lax requests.");
      assert_equals(cookies["samesite_lax"], expectedValue, "SameSite=Lax cookies are sent with lax requests.");
    } else if (expectedStatus == SameSiteStatus.STRICT) {
      assert_equals(cookies["samesite_strict"], expectedValue, "SameSite=Strict cookies are sent with strict requests.");
      assert_equals(cookies["samesite_lax"], expectedValue, "SameSite=Lax cookies are sent with strict requests.");
    }
}

//
// LeaveSecureCookiesAlone-specific test helpers:
//

window.SecureStatus = {
	COOKIE: "yes",
    NOCOOKIE: "no",
};

//Reset SameSite test cookies on |origin|. If |origin| matches `document.origin`, assert
//(via `document.cookie`) that they were properly removed and reset.
function resetSecureCookies(origin, value) {
return credFetch(origin + "/cookie/drop/secure")
 .then(_ => {
   if (origin == document.origin) {
     assert_dom_cookie("alone_secure", value, false);
     assert_dom_cookie("alone_insecure", value, false);
   }
 })
 .then(_ => {
   //Not working until we can test on secure origin
   return credFetch(origin + "/cookie/set/secure?" + value)
     .then(_ => {
       if (origin == document.origin) {
         assert_dom_cookie("alone_secure", value, true);
       }
     })
 })
 .then(_ => {
   return credFetch(origin + "/cookie/set/insecure?" + value)
     .then(_ => {
       if (origin == document.origin) {
         assert_dom_cookie("alone_insecure", value, true);
       }
     })
 })
}

//
// DOM based cookie manipulation API's
//

// borrowed from http://www.quirksmode.org/js/cookies.html
function create_cookie_from_js(name, value, days, secure_flag) {
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
  }
  else var expires = "";
  
  var secure = "";
  if (secure_flag == true) {
    secure = "secure; ";
  }
  document.cookie = name+"="+value+expires+"; "+secure+"path=/";
}

// erase cookie value and set for expiration
function erase_cookie_from_js(name) {
  create_cookie_from_js(name,"",-1);
}

// verify if cookie can be created from js
function createAloneCookieFromJavaScript(value, secure_cookie, cookie_expected) {

  //set test cookie
  create_cookie_from_js("cookiealone", value, 10, secure_cookie);
  
  //TODO: we have no way to reliably test in JS if secure cookie is present
  //so we need to send the cookie back to the server for verification
  assert_dom_cookie("cookiealone", value, cookie_expected);
}

//verify if cookie can be edited from js
function editAloneCookieFromJavaScript(value, secure_cookie, cookie_change_expected) {
	
  //force secure cookie to be deleted and created via HTTPS set=cookie
  if (secure_cookie == true) {
      create_cookie(window.SECURE_ORIGIN, "cookiealone", value, "secure;");
  } else {
	  create_cookie(window.ORIGIN, "cookiealone", value, "");   
  }
  
  //overwrite secure cookie with new value
  create_cookie_from_js("cookiealone", value+"different", 10, secure_cookie);
  
  //TODO: we have no way to reliably test in JS if secure cookie is present
  //so we need to send the cookie back to the server for verification
  assert_dom_cookie("cookiealone", value+"different", cookie_change_expected);
}

//verify if cookie can be read from js
function readAloneCookieFromJavaScript(value, secure_cookie, cookie_read_expected) {
  alert("value2: " + value);
  //force secure cookie to be deleted and created via HTTP set=cookie
  if (secure_cookie == true) {
      create_cookie(window.SECURE_ORIGIN, "cookiealone", value, "secure; ");
  } else {
	  alert("before: " + document.cookie);
	  create_cookie(window.ORIGIN, "cookiealone", value, "");   
	  alert("after: " + document.cookie);

  }
  
  //TODO: we have no way to reliably test in JS if secure cookie is present
  //so we need to send the cookie back to the server for verification
  alert(document.cookie + "-:-" + value + ":"+cookie_read_expected);
  assert_dom_cookie("cookiealone", value, cookie_read_expected);
}