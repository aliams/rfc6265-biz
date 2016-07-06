package samesite

import (
  "fmt"
  "net/http"
)

// Set up handlers.
func init() {
  http.HandleFunc("/", defaultHandler)
  http.HandleFunc("/redir", redirectHandler)
}

// Respond to `/` with a friendly message.
func defaultHandler(w http.ResponseWriter, r *http.Request) {
  fmt.Fprint(w, "Hello!");
}

// Respond to `/redir` by redirecting to the URL's query.
func redirectHandler(w http.ResponseWriter, r *http.Request) {
  to := r.FormValue("to")
  if len(to) == 0 {
    http.Error(w, "No destination present in the URL's query.", http.StatusInternalServerError)
    return
  }

  setNoCacheAndCORSHeaders(w, r)
  http.Redirect(w, r, to, http.StatusTemporaryRedirect);
}
