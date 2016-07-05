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

// Asserts that a request to |origin| contains or does not contain (according
// to the value of |present|) a cookie named |name| with a value of |value|.
function assert_http_cookie(origin, name, value, present) {
  return credFetch(origin + "/cookie/list")
      .then(r => r.json())
      .then(obj => {
        assert_cookie(origin, obj, name, value, present);
      });
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

// Embed `/cookie/postToParent` on |origin|, returning a Promise which will
// resolve with the cookie data it posts.
function embed_cookie_posting_iframe(origin) {
  return new Promise((resolve, reject) => {
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/cookie/postToParent";
    document.body.appendChild(iframe);
    window.addEventListener("message", e => {
      if (e.source == iframe.contentWindow) {
        document.body.removeChild(iframe);
        resolve(e.data);
      }
    });
    iframe.onerror = reject;
  });
}

// Set |ORIGIN|, |WWW_ORIGIN|, |SUBDOMAIN_HOST|, |CROSS_SITE_HOST| depending on the current
// document's origin.
(_ => {
  var HOST = "rfc6265.biz";
  var PORT = "";
  var CROSS_ORIGIN_HOST = "samesite-test.appspot.com";
  if (window.location.hostname.match(/rfc6265.test$/)) {
    PORT = ":8080"
    HOST = "rfc6265.test";
    CROSS_ORIGIN_HOST = "127.0.0.1";
  }
  window.ORIGIN = "http://" + HOST + PORT;
  window.WWW_ORIGIN = "http://www." + HOST + PORT;
  window.SUBDOMAIN_ORIGIN = "http://subdomain." + HOST + PORT;
  window.CROSS_SITE_ORIGIN = "http://" + CROSS_ORIGIN_HOST + PORT;

  // If we're not on |HOST|, move ourselves there:
  if (window.location.hostname != HOST)
    window.location.hostname = HOST;
})();
