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
  return origin + "/redir?" + url;
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
