package samesite

import (
  "fmt"
  "html/template"
  "net/http"
  "encoding/json"
)


// Set up all of our handlers.
func init() {
  http.HandleFunc("/", defaultHandler)
  http.HandleFunc("/cookie/drop", dropCookie)
  http.HandleFunc("/cookie/list", listCookie)
  http.HandleFunc("/cookie/set", setCookie)
  http.HandleFunc("/cookie/postToParent", postToParent)
}

// Set wide-open CORS and no-cache headers on |w|, given |r|'s `Origin` header.
func setResponseHeaders(w http.ResponseWriter, r *http.Request) {
  origin := r.Header.Get("Origin")
  if origin == "" {
    origin = "*"
  }
  w.Header().Set("Access-Control-Allow-Origin", origin)
  w.Header().Set("Access-Control-Allow-Credentials", "true")
  w.Header().Set("Cache-Control", "no-cache");
  w.Header().Set("Expires", "Fri, 01 Jan 1990 00:00:00 GMT")
}

// Respond to `/cookie/drop?name={name}` by expiring the cookie named `{name}`.
func dropCookie(w http.ResponseWriter, r *http.Request) {
  name := r.FormValue("name")
  if len(name) == 0 {
    http.Error(w, "No `name` parameter present.", http.StatusInternalServerError)
    return
  }

  // Expire the named cookie, and return a JSON-encoded success code.
  setResponseHeaders(w, r)
  w.Header().Set("Content-Type", "application/json; charset=utf-8")
  http.SetCookie(w, &http.Cookie{Name: name, Value: "_", MaxAge: -1})
  fmt.Fprint(w, "{\"success\": true}")
}

// Strip |r|'s cookies down to a name/value pair (as we don't actually
// get any additional data in the `cookie` request header).
func extractRequestCookies(r *http.Request) map[string]string {
  requestCookies := make(map[string]string, len(r.Cookies()))
  for _, cookie := range r.Cookies() {
    requestCookies[cookie.Name] = cookie.Value
  }
  return requestCookies
}

// Respond to `/cookie/list` by dumping the cookies contained in the request as
// a JSON-encoded string of Name/Value tuples.
func listCookie(w http.ResponseWriter, r *http.Request) {
  // Stringify the resulting array, and deliver it as JSON with wide-open CORS
  // headers in order to allow access from everywhere.
  setResponseHeaders(w, r)
  w.Header().Set("Content-Type", "application/json; charset=utf-8")
  err := json.NewEncoder(w).Encode(extractRequestCookies(r))
  if err != nil {
    http.Error(w, "Failed to JSON encode the request's cookies.", http.StatusInternalServerError)
    return
  }
}

// Respond to `/cookie/postToParent` by sending the same list of cookies generated
// for `/cookie/list` to a parent window via `postMessage`.
func postToParent(w http.ResponseWriter, r *http.Request) {
  setResponseHeaders(w, r)
  w.Header().Set("Content-Type", "text/html; charset=utf-8")

  const tmpl = `
<!DOCTYPE html>
<script>
  var data = {{.}};

  if (window.parent != window)
    window.parent.postMessage(data, "*");

  if (window.opener)
    window.opener.postMessage(data, "*");
</script>
  `
  t, err := template.New("page").Parse(tmpl)
  err = t.Execute(w, extractRequestCookies(r))
  if err != nil {
    http.Error(w, "Failed to dump cookies into the JSON template.", http.StatusInternalServerError)
    return
  }
}

// Respond to `/cookie/set?{cookie}` by echoing `{cookie}` as a `Set-Cookie`
// header.
func setCookie(w http.ResponseWriter, r *http.Request) {
  query := r.URL.RawQuery
  if len(query) == 0 {
    http.Error(w, "No cookie present in the URL's query.", http.StatusInternalServerError)
    return
  }

  setResponseHeaders(w, r)
  w.Header().Add("Set-Cookie", query)
  fmt.Fprint(w, fmt.Sprintf("Wrote `%s`.", query))
}

// Respond to `/` with a friendly message.
func defaultHandler(w http.ResponseWriter, r *http.Request) {
  fmt.Fprint(w, "Hello!");
}
