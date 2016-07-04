package samesite

import (
  "fmt"
  "net/http"
  "encoding/json"
)


// Set up all of our handlers.
func init() {
  http.HandleFunc("/", defaultHandler)
  http.HandleFunc("/cookie/drop", dropCookie)
  http.HandleFunc("/cookie/list", listCookie)
  http.HandleFunc("/cookie/set", setCookie)
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

// Respond to `/cookie/list` by dumping the cookies contained in the request as
// a JSON-encoded string of Name/Value tuples.
func listCookie(w http.ResponseWriter, r *http.Request) {
  // Strip the request cookie down to a name/value pair (as we don't actually
  // get any additional data in the `cookie` request header).
  requestCookies := make(map[string]string, len(r.Cookies()))
  for _, cookie := range r.Cookies() {
    requestCookies[cookie.Name] = cookie.Value
  }

  // Stringify the resulting array, and deliver it as JSON with wide-open CORS
  // headers in order to allow access from everywhere.
  setResponseHeaders(w, r)
  w.Header().Set("Content-Type", "application/json; charset=utf-8")
  err := json.NewEncoder(w).Encode(requestCookies)
  if err != nil {
    http.Error(w, "Failed to JSON encode the request's cookies.", http.StatusInternalServerError)
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
