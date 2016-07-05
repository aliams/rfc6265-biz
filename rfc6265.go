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
  query := r.URL.RawQuery
  if len(query) == 0 {
    http.Error(w, "No cookie present in the URL's query.", http.StatusInternalServerError)
    return
  }

  setNoCacheAndCORSHeaders(w, r)
  http.Redirect(w, r, query, http.StatusTemporaryRedirect);
}
