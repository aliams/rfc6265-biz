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

// Respond to `/cookie/drop?name={name}` by expiring the cookie named `{name}`.
func dropCookie(w http.ResponseWriter, r *http.Request) {
  name := r.FormValue("name")
  if len(name) == 0 {
    http.Error(w, "No `name` parameter present.", http.StatusInternalServerError)
    return
  }

  http.SetCookie(w, &http.Cookie{Name: name, Value: "_", MaxAge: -1})
}

// Respond to `/cookie/list` by dumping the cookies contained in the request as
// a JSON-encoded string.
func listCookie(w http.ResponseWriter, r *http.Request) {
  err := json.NewEncoder(w).Encode(r.Cookies())
  if err != nil {
    http.Error(w, "Failed to JSON encode the request's cookies.", http.StatusInternalServerError)
    return
  }

  w.Header().Set("Content-Type", "application/json; charset=utf-8")
}

// Respond to `/cookie/set?{cookie}` by echoing `{cookie}` as a `Set-Cookie`
// header.
func setCookie(w http.ResponseWriter, r *http.Request) {
  query := r.URL.RawQuery
  if len(query) == 0 {
    http.Error(w, "No cookie present in the URL's query.", http.StatusInternalServerError)
    return
  }

  w.Header().Add("Set-Cookie", query)
  fmt.Fprint(w, fmt.Sprintf("Wrote `%s`.", query))
}

// Respond to `/` with a friendly message.
func defaultHandler(w http.ResponseWriter, r *http.Request) {
  fmt.Fprint(w, "Hello!");
}
